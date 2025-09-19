import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './db'; // Reutiliza a pool de conexão existente
import path from 'path';

const db = drizzle(pool);

async function runMigrations() {
  console.log("Iniciando a execução das migrações do banco de dados...");
  try {
    // O caminho para a pasta de migrações gerada pelo Drizzle Kit
    const migrationsFolder = path.resolve('migrations');

    await migrate(db, { migrationsFolder });
    
    console.log("✅ Migrações aplicadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao aplicar as migrações:", error);
    process.exit(1); // Encerra o processo com erro
  } finally {
    await pool.end(); // Fecha a conexão
    console.log("Conexão com o banco de dados finalizada.");
  }
}

runMigrations();