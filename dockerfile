# Estágio 1: Builder - Constrói o frontend e compila o backend
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .

# Constrói a aplicação (frontend e backend)
RUN npm run build

# Estágio 2: Produção - Imagem final otimizada
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copia os artefatos compilados do estágio de build
COPY --from=builder /app/dist ./dist
COPY migrations migrations

# Copia apenas os ficheiros essenciais para o entrypoint.sh
COPY drizzle.config.ts .
COPY tsconfig.json .
COPY shared ./shared
COPY server/create-admin.ts ./server/create-admin.ts

# Copia e prepara o script de entrada
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expõe a porta e define o ponto de entrada
EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]