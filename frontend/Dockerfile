# ============================================================================
# DOCKERFILE - FRONTEND MES Mundial S.A
# ============================================================================
# Dockerfile para o frontend Next.js.
# Relaciona-se com: docker-compose.yml, package.json
# Inclui: Landing page, Dashboard, BI, Configurações
# ============================================================================

FROM node:18-alpine AS base

# Define diretório de trabalho
WORKDIR /app

# Copia package files
COPY package.json package-lock.json* ./

# Instala dependências
RUN npm ci

# Copia código do frontend
COPY . .

# Build do Next.js
RUN npm run build

# Imagem de produção
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Cria usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copia arquivos necessários
COPY --from=base /app/public ./public
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
