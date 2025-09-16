# Estágio 1: Build
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
# Instala TODAS as dependências (prod + dev) para o build
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Estágio 2: Produção
# MUDANÇA AQUI: Trocado alpine por slim
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./

# Instala TODAS as dependências novamente, incluindo as de desenvolvimento
# para que o 'drizzle-kit' esteja disponível.
RUN npm install --legacy-peer-deps

# Copia os artefatos compilados do estágio de build
COPY --from=build /app/dist ./dist

# Copia os arquivos fonte necessários para a execução
COPY tsconfig.json .
COPY shared shared
COPY server server
COPY drizzle.config.ts .

# Copia e prepara o script de entrada
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]