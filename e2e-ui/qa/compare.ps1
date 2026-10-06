# Compares two Playwright JSON reports and prints the new / fixed failure sets.
#
# Used to tell a regression introduced by a change apart from a failure that was
# already there, which is the only honest way to report on a suite that was
# already red.
#
#   .\qa\compare.ps1 -Before qa\baseline-full.json -After qa\after-change-full.json
param(
  [Parameter(Mandatory = $true)][string]$Before,
  [Parameter(Mandatory = $true)][string]$After
)

function Read-Results([string]$Path) {
  $raw = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
  $start = $raw.IndexOf('{')
  if ($start -lt 0) { throw "no JSON object in $Path" }

  $report = $raw.Substring($start) | ConvertFrom-Json
  $rows = @{}

  function Walk($suite, $prefix) {
    $title = $suite.title
    $path = if ($prefix) { "$prefix > $title" } else { $title }

    foreach ($spec in $suite.specs) {
      foreach ($test in $spec.tests) {
        $result = $test.results[0]
        $key = "$path :: $($spec.title)"

        $message = ''
        if ($result.error) { $message = ($result.error.message -split "`n")[0] }

        $rows[$key] = [pscustomobject]@{
          status = $result.status
          error  = $message
        }
      }
    }

    foreach ($child in $suite.suites) { Walk $child $path }
  }

  foreach ($suite in $report.suites) { Walk $suite '' }

  return $rows
}

$beforeRows = Read-Results $Before
$afterRows  = Read-Results $After

$beforeFailed = @($beforeRows.GetEnumerator() | Where-Object { $_.Value.status -ne 'passed' } | ForEach-Object { $_.Key })
$afterFailed  = @($afterRows.GetEnumerator()  | Where-Object { $_.Value.status -ne 'passed' } | ForEach-Object { $_.Key })

$newFailures  = @($afterFailed  | Where-Object { $beforeFailed -notcontains $_ } | Sort-Object)
$fixed        = @($beforeFailed | Where-Object { $afterFailed  -notcontains $_ } | Sort-Object)
$both         = @($afterFailed  | Where-Object { $beforeFailed -contains $_ } | Sort-Object)

Write-Host ""
Write-Host ("before: {0} run, {1} failed" -f $beforeRows.Count, $beforeFailed.Count)
Write-Host ("after:  {0} run, {1} failed" -f $afterRows.Count, $afterFailed.Count)
Write-Host ""

Write-Host ("PRE-EXISTING FAILURES (fail both before and after): {0}" -f $both.Count)
foreach ($key in $both) {
  Write-Host ("  - {0}" -f $key)
  Write-Host ("      {0}" -f $afterRows[$key].error)
}

Write-Host ""
Write-Host ("NEW FAILURES (fail only after): {0}" -f $newFailures.Count)
foreach ($key in $newFailures) {
  Write-Host ("  - {0}" -f $key)
  Write-Host ("      {0}" -f $afterRows[$key].error)
}

Write-Host ""
Write-Host ("NO LONGER FAILING (fail before, pass after): {0}" -f $fixed.Count)
foreach ($key in $fixed) {
  Write-Host ("  - {0}" -f $key)
}

Write-Host ""
if ($newFailures.Count -eq 0) {
  Write-Host "RESULT: no new failures."
} else {
  Write-Host "RESULT: $($newFailures.Count) new failure(s)."
}