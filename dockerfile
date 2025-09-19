# Estágio 1: Builder - Constrói o frontend e compila o backend
FROM node:20-slim AS builder
WORKDIR /app

# Copia os manifestos de pacotes e instala TODAS as dependências
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copia o resto do código-fonte (respeitando o .dockerignore)
COPY . .

# Constrói a aplicação (frontend e backend)
RUN npm run build

# Estágio 2: Produção - Imagem final otimizada
FROM node:20-slim
WORKDIR /app

# Define o ambiente para produção
ENV NODE_ENV=production

# Copia os manifestos de pacotes novamente
COPY package*.json ./

# Instala TODAS as dependências. As devDependencies (drizzle-kit, tsx)
# são necessárias para que o script entrypoint.sh possa correr as migrações na inicialização.
RUN npm install --legacy-peer-deps

# Copia os artefatos compilados do estágio de build
COPY --from=builder /app/dist ./dist

# Copia apenas os ficheiros essenciais para o entrypoint.sh
COPY drizzle.config.ts .
COPY tsconfig.json .
COPY shared ./shared
COPY server/create-admin.ts ./server/create-admin.ts
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expõe a porta e define o ponto de entrada
EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]