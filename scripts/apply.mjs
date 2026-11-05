import { execSync } from "node:child_process";
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function listStacks() {
	return readdirSync(join(root, "templates"));
}

export function loadTemplate(stack) {
	const dir = join(root, "templates", stack);
	if (!existsSync(join(dir, "template.json"))) {
		throw new Error(`Unknown stack "${stack}". Available: ${listStacks().join(", ")}`);
	}
	return { dir, config: JSON.parse(readFileSync(join(dir, "template.json"), "utf8")) };
}

function run(command, cwd) {
	console.log(`\n$ ${command}`);
	execSync(command, { cwd, stdio: "inherit" });
}

function merge(target, source) {
	for (const [key, value] of Object.entries(source)) {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			target[key] = merge(target[key] ?? {}, value);
		} else {
			target[key] = value;
		}
	}
	return target;
}

export function apply(stack, projectDir) {
	const { dir, config } = loadTemplate(stack);
	const project = resolve(projectDir);
	const pkgPath = join(project, "package.json");
	if (!existsSync(pkgPath)) throw new Error(`No package.json in ${project}`);

	for (const file of config.removeFiles ?? [])
		rmSync(join(project, file), { recursive: true, force: true });

	if (config.shared !== false) cpSync(join(root, "shared"), project, { recursive: true });
	if (existsSync(join(dir, "files"))) cpSync(join(dir, "files"), project, { recursive: true });

	for (const { file, from, to } of config.replace ?? []) {
		const path = join(project, file);
		if (existsSync(path)) writeFileSync(path, readFileSync(path, "utf8").replaceAll(from, to));
	}

	const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
	for (const name of config.removeDependencies ?? []) {
		delete pkg.dependencies?.[name];
		delete pkg.devDependencies?.[name];
	}
	merge(pkg, config.package ?? {});
	writeFileSync(pkgPath, `${JSON.stringify(pkg, null, "\t")}\n`);

	const devDeps = (config.devDependencies ?? []).join(" ");
	if (devDeps) {
		const install = config.installCommand ?? "npm install --save-dev {packages}";
		run(install.replace("{packages}", devDeps), project);
	}
	if (config.moveToDevDependencies) {
		const updated = JSON.parse(readFileSync(pkgPath, "utf8"));
		for (const name of config.moveToDevDependencies) {
			const version = updated.dependencies?.[name];
			if (!version) continue;
			delete updated.dependencies[name];
			updated.devDependencies = { ...updated.devDependencies, [name]: version };
		}
		updated.devDependencies = Object.fromEntries(
			Object.entries(updated.devDependencies).sort(),
		);
		writeFileSync(pkgPath, `${JSON.stringify(updated, null, "\t")}\n`);
		run("npm install", project);
	}

	run("npm run lint:fix", project);
	run("npm run format", project);
	run("npm run check", project);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const [stack, projectDir = "."] = process.argv.slice(2);
	if (!stack) {
		console.log(
			`Usage: node scripts/apply.mjs <stack> [projectDir]\nStacks: ${listStacks().join(", ")}`,
		);
		process.exit(1);
	}
	apply(stack, projectDir);
}
