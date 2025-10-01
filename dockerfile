FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY --from=builder /app/dist ./dist
COPY migrations migrations
COPY drizzle.config.ts .
COPY tsconfig.json .
COPY shared ./shared
COPY server/create-admin.ts ./server/create-admin.ts

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]