import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './db';
import path from 'path';

const db = drizzle(pool);

async function runMigrations() {
  console.log("Iniciando a execução das migrações do banco de dados...");
  try {
    const migrationsFolder = path.resolve('migrations');

    await migrate(db, { migrationsFolder });
    
    console.log("✅ Migrações aplicadas com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao aplicar as migrações:", error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log("Conexão com o banco de dados finalizada.");
  }
}

runMigrations();