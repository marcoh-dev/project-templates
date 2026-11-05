import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { apply, listStacks, loadTemplate } from "./apply.mjs";

const [stack, name] = process.argv.slice(2);
if (!stack || !name) {
	console.log(`Usage: node scripts/new.mjs <stack> <name>\nStacks: ${listStacks().join(", ")}`);
	process.exit(1);
}
if (existsSync(resolve(name))) {
	console.error(`${resolve(name)} already exists`);
	process.exit(1);
}

const { config } = loadTemplate(stack);
const command = config.create.replaceAll("{name}", name);
console.log(`$ ${command}`);
execSync(command, { stdio: "inherit" });

apply(stack, name);
console.log(`\nDone: ${resolve(name)}`);
