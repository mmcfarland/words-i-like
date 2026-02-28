import process from 'node:process'
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

async function start() {
  const port = Number(process.env.PORT) || 3001
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server listening on port ${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

export { app }
