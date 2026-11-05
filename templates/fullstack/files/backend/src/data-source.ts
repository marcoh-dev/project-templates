import { existsSync } from "node:fs";

import { DataSource } from "typeorm";

if (existsSync(".env")) process.loadEnvFile();

export default new DataSource({
	type: "postgres",
	url: process.env.DATABASE_URL,
	entities: ["dist/**/*.entity.js"],
	migrations: ["dist/migrations/*.js"],
});
