#!/bin/sh
# O comando "set -e" garante que o script irá parar se algum comando falhar.
set -e
echo "Rodando as migrações do banco de dados..."

# Executa as migrações do banco de dados
#npm run db:migrate

# Cria o usuário administrador se não existir
echo "Criando usuário administrador..."
npm run create:admin:docker

echo "Iniciando a aplicação..."
exec "$@"