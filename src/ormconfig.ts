import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const ext = process.env.NODE_ENV === "production" ? "js" : "ts";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306"),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [path.join(__dirname, `entities/**/*.${ext}`)],
  synchronize: process.env.NODE_ENV !== "production", // Desativar em produção
});
