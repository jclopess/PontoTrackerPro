#!/bin/bash
set -e

# Caminho para o ficheiro de backup dentro do container
BACKUP_FILE="/backups/backup_producao_v1.dump"

# Verifica se o ficheiro de backup existe
if [ -f "$BACKUP_FILE" ]; then
  echo "Ficheiro de backup encontrado em $BACKUP_FILE. A restaurar a base de dados..."
  # Utiliza o pg_restore para carregar o backup.
  # O utilizador e o nome da base de dados são passados como variáveis de ambiente pelo docker-compose.
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v "$BACKUP_FILE"
  echo "Base de dados restaurada com sucesso."
else
  echo "Nenhum ficheiro de backup encontrado em $BACKUP_FILE. A prosseguir com uma nova base de dados vazia."
fi
