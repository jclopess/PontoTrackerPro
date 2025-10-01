#!/bin/bash
set -e

BACKUP_FILE="/backups/producao_backup.backup"

if [ -f "$BACKUP_FILE" ]; then
  echo "Ficheiro de backup encontrado em $BACKUP_FILE. A restaurar a base de dados..."
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v "$BACKUP_FILE"
  echo "Base de dados restaurada com sucesso."
else
  echo "Nenhum ficheiro de backup encontrado em $BACKUP_FILE. A prosseguir com uma nova base de dados vazia."
fi
