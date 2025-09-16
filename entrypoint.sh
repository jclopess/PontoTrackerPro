#!/bin/sh
# O comando "set -e" garante que o script irá parar se algum comando falhar.
set -e

# Aguarda o banco de dados estar pronto (opcional, mas recomendado)
# Adicionaremos um healthcheck no docker-compose para isso

echo "Rodando as migrações do banco de dados..."
# A variável DATABASE_URL já estará disponível no ambiente do contêiner
npm run db:push:docker

echo "Criando usuário administrador..."
npm run create:admin:docker

echo "Iniciando a aplicação..."
# Executa o comando principal que foi passado para o contêiner (o CMD do Dockerfile)
exec "$@"