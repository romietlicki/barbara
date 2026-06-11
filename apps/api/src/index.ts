import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Deve rodar ANTES de qualquer import dinâmico que use process.env.
// Imports estáticos são hoistados em ESM — usamos dynamic import para buildApp abaixo.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '../../../.env'))
  } catch { /* .env ausente — variáveis devem ser injetadas por outro meio */ }
}

// Import dinâmico garante que @repo/db (PrismaClient) só é instanciado
// depois que DATABASE_URL está no process.env
const { buildApp } = await import('./app.js')

const PORT = parseInt(process.env['API_PORT'] ?? '3001', 10)
const HOST = process.env['API_HOST'] ?? '0.0.0.0'

async function start(): Promise<void> {
  const app = await buildApp()

  try {
    await app.listen({ port: PORT, host: HOST })
    console.log(`API rodando em http://${HOST}:${PORT}`)
  } catch (err) {
    console.error('Falha ao iniciar a API:', err)
    process.exit(1)
  }
}

start()
