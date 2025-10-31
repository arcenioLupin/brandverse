import pg from "pg";
const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: String(process.env.DATABASE_URL) })
  : new Pool({
      host: process.env.PGHOST ?? "localhost",
      port: Number(process.env.PGPORT ?? 5432),
      user: String(process.env.PGUSER ?? "brandverse"),
      password: String(process.env.PGPASSWORD ?? "brandverse"),
      database: String(process.env.PGDATABASE ?? "brandverse"),
      ssl: false,
    });
