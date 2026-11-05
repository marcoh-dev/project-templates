import { create, gitRoot, listStacks } from "./apply.mjs";

const args = process.argv.slice(2);
const noCi = args.includes("--no-ci");
const [stack, name] = args.filter((arg) => !arg.startsWith("--"));
if (!stack || !name) {
	console.log(
		`Usage: node scripts/new.mjs <stack> <name> [--no-ci]\nStacks: ${listStacks().join(", ")}`,
	);
	process.exit(1);
}

let ci = !noCi;
if (ci && gitRoot(process.cwd())) {
	console.log(
		"Inside an existing git repo: GitHub only runs workflows from the repo root, skipping CI.",
	);
	ci = false;
}

console.log(`\nDone: ${create(stack, name, { ci })}`);
