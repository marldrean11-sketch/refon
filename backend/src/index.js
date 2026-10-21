import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'
import { storage } from './services/storage.service.js'
import { cancelStaleOrders } from './services/order.service.js'

console.log(`ReFon photo storage driver: ${storage.name}`)

const server = app.listen(env.port, () => {
  console.log(`ReFon API listening on http://localhost:${env.port}`)
})

// Orders the seller never confirmed are cancelled and their phones put back on
// sale. Checked shortly after start and then every 15 minutes while the API is
// awake (a sleeping free instance catches up on its next start).
const ORDER_SWEEP_MS = 15 * 60 * 1000

function sweepStaleOrders() {
  cancelStaleOrders()
    .then((count) => {
      if (count > 0) console.log(`[orders] auto-cancelled ${count} unconfirmed order(s)`)
    })
    .catch((error) => console.error('[orders] auto-cancel sweep failed:', error.message))
}

if (env.nodeEnv !== 'test') {
  setTimeout(sweepStaleOrders, 30_000).unref()
  setInterval(sweepStaleOrders, ORDER_SWEEP_MS).unref()
}

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing the ReFon API.`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
