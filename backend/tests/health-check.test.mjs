import assert from 'node:assert/strict'

process.env.NODE_ENV = 'test'

const { startOfManilaDay } = await import('../src/services/health-check.service.js')

const failures = []

function check(name, run) {
  try {
    run()
    console.log(`  ok  ${name}`)
  } catch (error) {
    failures.push({ name, error })
    console.log(`  FAIL ${name}: ${error.message}`)
  }
}

console.log('— startOfManilaDay —')

check('11pm UTC is already the next day in Manila', () => {
  // 2026-10-11 23:30 UTC is 2026-10-12 07:30 in Manila.
  const start = startOfManilaDay(new Date('2026-10-11T23:30:00Z'))
  assert.equal(start.toISOString(), '2026-10-11T16:00:00.000Z')
})

check('early afternoon UTC is still the same Manila day', () => {
  // 2026-10-12 14:00 UTC is 2026-10-12 22:00 in Manila.
  const start = startOfManilaDay(new Date('2026-10-12T14:00:00Z'))
  assert.equal(start.toISOString(), '2026-10-11T16:00:00.000Z')
})

check('exactly Manila midnight starts a new day', () => {
  const start = startOfManilaDay(new Date('2026-10-12T16:00:00Z'))
  assert.equal(start.toISOString(), '2026-10-12T16:00:00.000Z')
})

if (failures.length > 0) {
  console.error(`\n${failures.length} health-check test(s) failed.`)
  process.exit(1)
}

console.log('\nHealth-check counter tests passed: "today" follows the Manila calendar day.')
process.exit(0)
