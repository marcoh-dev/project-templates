import { execSync } from "node:child_process";
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
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

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`);
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

function sortDevDependencies(pkgPath, moveFromDependencies) {
	const pkg = readJson(pkgPath);
	for (const name of moveFromDependencies) {
		const version = pkg.dependencies?.[name];
		if (!version) continue;
		delete pkg.dependencies[name];
		pkg.devDependencies = { ...pkg.devDependencies, [name]: version };
	}
	pkg.devDependencies = Object.fromEntries(Object.entries(pkg.devDependencies ?? {}).sort());
	writeJson(pkgPath, pkg);
}

export function gitRoot(dir) {
	try {
		const top = execSync("git rev-parse --show-toplevel", { cwd: dir, stdio: "pipe" });
		return realpathSync(top.toString().trim());
	} catch {
		return null;
	}
}

export function create(stack, name, { cwd = process.cwd(), ci = true } = {}) {
	const { config } = loadTemplate(stack);
	const target = resolve(cwd, name);
	if (existsSync(target)) throw new Error(`${target} already exists`);

	if (config.workspaces) {
		mkdirSync(target);
		for (const [workspace, workspaceStack] of Object.entries(config.workspaces)) {
			create(workspaceStack, workspace, { cwd: target, ci: false });
			rmSync(join(target, workspace, ".github"), { recursive: true, force: true });
			for (const file of [
				".git",
				".vscode",
				".nvmrc",
				"scripts",
				"package-lock.json",
				"node_modules",
			]) {
				rmSync(join(target, workspace, file), { recursive: true, force: true });
			}
			const workspacePkgPath = join(target, workspace, "package.json");
			const workspacePkg = readJson(workspacePkgPath);
			delete workspacePkg.scripts.sync;
			delete workspacePkg.scripts["sync:branch"];
			writeJson(workspacePkgPath, workspacePkg);
		}
	} else {
		run(config.create.replaceAll("{name}", name), cwd);
	}
	apply(stack, target, { ci });
	return target;
}

export function apply(stack, projectDir, { ci = true } = {}) {
	const { dir, config } = loadTemplate(stack);
	const project = resolve(projectDir);
	const name = basename(project);
	const pkgPath = join(project, "package.json");

	for (const file of config.removeFiles ?? []) {
		rmSync(join(project, file), { recursive: true, force: true });
	}

	if (config.shared !== false) cpSync(join(root, "shared"), project, { recursive: true });
	if (existsSync(join(dir, "files"))) {
		const skipCi = (src) => ci || !src.includes(`${sep}.github`);
		cpSync(join(dir, "files"), project, { recursive: true, filter: skipCi });
	}
	if (!existsSync(pkgPath)) throw new Error(`No package.json in ${project}`);

	for (const { file, from, to } of config.replace ?? []) {
		const path = join(project, file);
		if (!existsSync(path)) continue;
		writeFileSync(
			path,
			readFileSync(path, "utf8").replaceAll(from, to.replaceAll("{name}", name)),
		);
	}

	const pkg = readJson(pkgPath);
	for (const dependency of config.removeDependencies ?? []) {
		delete pkg.dependencies?.[dependency];
		delete pkg.devDependencies?.[dependency];
	}
	merge(pkg, config.package ?? {});
	writeJson(pkgPath, pkg);

	for (const [workspace, values] of Object.entries(config.workspacePackage ?? {})) {
		const workspacePkgPath = join(project, workspace, "package.json");
		writeJson(workspacePkgPath, merge(readJson(workspacePkgPath), values));
	}

	const devDeps = (config.devDependencies ?? []).join(" ");
	const install = config.installCommand ?? "npm install --save-dev {packages}";
	run(devDeps ? install.replace("{packages}", devDeps) : "npm install", project);

	for (const [workspace, packages] of Object.entries(config.workspaceDependencies ?? {})) {
		run(`npm install ${packages.join(" ")} -w ${workspace}`, project);
	}

	if (config.moveToDevDependencies) {
		sortDevDependencies(pkgPath, config.moveToDevDependencies);
		run("npm install", project);
	}

	for (const [from, to] of config.copyFiles ?? []) {
		if (!existsSync(join(project, to))) copyFileSync(join(project, from), join(project, to));
	}

	run("npm run lint:fix", project);
	run("npm run format", project);
	run("npm run check", project);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const [stack, projectDir = "."] = args.filter((arg) => !arg.startsWith("--"));
	if (!stack) {
		console.log(
			`Usage: node scripts/apply.mjs <stack> [projectDir] [--no-ci]\nStacks: ${listStacks().join(", ")}`,
		);
		process.exit(1);
	}
	let ci = !args.includes("--no-ci");
	const repoRoot = gitRoot(projectDir);
	if (ci && repoRoot && repoRoot !== realpathSync(projectDir)) {
		console.log(
			"Not a git repo root: GitHub only runs workflows from the repo root, skipping CI.",
		);
		ci = false;
	}
	apply(stack, projectDir, { ci });
}
