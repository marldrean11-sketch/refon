# Prints a pass/fail table from a Playwright JSON report.
#
# The reporter writes its setup log to stdout before the JSON document, so the
# file is not parseable as-is. This strips everything before the JSON object
# starts.
param([string]$Path = "qa\report.json")

$raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$start = $raw.IndexOf('{')

if ($start -lt 0) {
  throw "no JSON object found in $Path"
}

$report = $raw.Substring($start) | ConvertFrom-Json

$rows = New-Object System.Collections.Generic.List[object]

function Walk($suite) {
  foreach ($spec in $suite.specs) {
    foreach ($test in $spec.tests) {
      $result = $test.results[0]

      # The file lives on `test.location` in some reporter versions and on the
      # suite itself in others; fall back rather than assume.
      $location = $test.location
      if ($null -eq $location) { $location = $spec.location }

      $shortFile = ''
      if ($null -ne $location -and $location.file) {
        $shortFile = Split-Path -Leaf $location.file
      }

      $message = ''
      if ($result.error) {
        $message = ($result.error.message -split "`n")[0]
      }

      $rows.Add([pscustomobject]@{
        status = $result.status
        file   = $shortFile
        title  = $spec.title
        error  = $message
      })
    }
  }

  foreach ($child in $suite.suites) {
    Walk $child
  }
}

foreach ($suite in $report.suites) {
  Walk $suite
}

$failed = @($rows | Where-Object { $_.status -eq 'failed' })
$passed = @($rows | Where-Object { $_.status -eq 'passed' })

Write-Host ""
Write-Host "=== $($report.stats.expected) expected / $($passed.Count) passed / $($failed.Count) failed ==="

if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "FAILURES:"
  foreach ($row in $failed) {
    Write-Host ("  [{0}] {1}" -f $row.file, $row.title)
    if ($row.error) {
      Write-Host ("      {0}" -f $row.error)
    }
  }
}

Write-Host ""
foreach ($row in ($rows | Sort-Object status, file, title)) {
  $mark = 'pass'
  if ($row.status -eq 'failed') { $mark = 'FAIL' }
  Write-Host ("  {0}  {1,-26} {2}" -f $mark, $row.file, $row.title)
}