import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// process.loadEnvFile disponível a partir do Node 20.12
// Carrega o .env do root do monorepo para que AUTH_SECRET e demais vars
// fiquem acessíveis ao Next.js sem duplicar o arquivo em apps/web/
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.join(__dirname, '../../.env'))
  } catch {
    // .env ausente no root — variáveis devem ser injetadas por outro meio
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/db', '@repo/whatsapp'],
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  images: {
    remotePatterns: [
      {
        // TODO: Restringir para o domínio do R2 em produção
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
}

export default nextConfig
