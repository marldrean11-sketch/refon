import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './config/prisma.js'

const server = app.listen(env.port, () => {
  console.log(`ReFon API listening on http://localhost:${env.port}`)
})

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing the ReFon API.`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
