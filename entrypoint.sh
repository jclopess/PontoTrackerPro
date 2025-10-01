#!/bin/sh
set -e
echo "Rodando as migrações do banco de dados..."

#npm run db:migrate

echo "Criando usuário administrador..."
npm run create:admin:docker

echo "Iniciando a aplicação..."
exec "$@"