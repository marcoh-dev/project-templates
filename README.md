# project-templates

My project setup for new and existing projects: strict TypeScript, Prettier, ESLint with sorted imports and `@/` path aliases, and VS Code format/fix on save.

The templates don't contain whole projects. Each project is created with the official tool for its stack (so it's always up to date), then the files and settings from this repo are applied on top.

## Stacks

| Stack        | Created with                                                     | Notes                                            |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `expo`       | `create-expo-app` (blank-typescript), code moved to `src/`       | ESLint via `expo lint`                           |
| `nextjs`     | `create-next-app` (App Router, Tailwind, React Compiler, `src/`) | Tailwind class sorting via Prettier plugin       |
| `react-vite` | `create-vite` (react-ts)                                         | oxlint replaced with ESLint, Vitest added        |
| `nest`       | `@nestjs/cli new` (ESM, Vitest)                                  | oxlint replaced with ESLint (type-checked rules) |
| `fullstack`  | `nextjs` in `frontend/` + `nest` in `backend/` as pnpm workspace | Postgres (Docker), TypeORM, GitHub Actions CI    |

`fullstack` is set up like food-swap: one `pnpm install` and `pnpm dev` at the root start the database, the backend (port 3000) and the frontend (port 5173). The generated project has its own README with all commands.

## Requirements

- Node 24 (`fnm use 24`)
- pnpm (`brew install pnpm`), see [pnpm](#pnpm)
- GitHub CLI logged in (`gh auth status`), as long as this repo is private
- Docker, for `fullstack`

## Usage

Clone once:

```bash
gh repo clone marcoh-dev/project-templates ~/project-templates
```

Create a new project in the current directory:

```bash
node ~/project-templates/scripts/new.mjs <stack> <name>

node ~/project-templates/scripts/new.mjs expo my-app
node ~/project-templates/scripts/new.mjs nextjs my-site
node ~/project-templates/scripts/new.mjs react-vite my-spa
node ~/project-templates/scripts/new.mjs nest my-api
node ~/project-templates/scripts/new.mjs fullstack my-platform
```

Apply a stack's setup to an existing project (overwrites the config files listed under [What gets applied](#what-gets-applied), so commit first):

```bash
node ~/project-templates/scripts/apply.mjs <stack> [projectDir]
```

Both scripts take `--no-ci` to leave out the GitHub Actions workflow (see [CI](#ci)).

With Claude Code, use the skills instead: `/new-project <stack> <name>` and `/setup-tooling` (proposes the changes first, keeps existing customizations).

Update the templates before use:

```bash
git -C ~/project-templates pull
```

## What you get

Every project has these scripts:

```bash
pnpm lint          # ESLint
pnpm lint:fix      # ESLint with auto-fix
pnpm format        # Prettier, write
pnpm format:check  # Prettier, check only
pnpm typecheck     # tsc (Next.js generates its types first with next typegen)
pnpm check         # lint + format:check + typecheck
pnpm sync          # switch to main, pull, install dependencies
pnpm sync:branch   # merge main into the current branch (without committing), install dependencies
```

`sync` runs `pnpm install`, which finishes in milliseconds when `pnpm-lock.yaml` hasn't changed. In `fullstack` it also starts the database and runs pending migrations, and `pnpm db:reset` recreates the local database from scratch. `sync:branch` prepares the merge but doesn't commit it, so you can check it first (`git merge --abort` undoes it). After a reinstall in VS Code, run **Developer: Reload Window** so the TypeScript and ESLint servers pick up the new `node_modules`.

Rules in every stack:

- Prettier: tabs (width 4), print width 100, double quotes
- Imports grouped (packages, `@/…`, relative) and sorted alphabetically, no duplicates
- `../` imports are errors, use `@/…` instead (`./` and subfolders are fine)
- `any` and unused variables/imports are errors
- TypeScript `strict` and `noUncheckedIndexedAccess`; `verbatimModuleSyntax` everywhere except `nest`
- VS Code: Prettier formats on save, ESLint fixes on save, auto-imports prefer `@/…`
- Node 24 via `.nvmrc` and `engines`
- pnpm via `packageManager` and `devEngines` (npm is blocked)
- Accessibility lint rules in `nextjs` and `react-vite` (see [Accessibility](#accessibility))
- GitHub Actions CI (see below)

## Accessibility

Lint rules only catch structural mistakes. Contrast, screen reader flow, focus order and touch target sizes need tests or manual checks.

| Stack                                          | Lint                                                                                                 | Beyond lint                                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `nextjs`, `react-vite`, `fullstack` (frontend) | `eslint-plugin-jsx-a11y` recommended rules as errors: alt text, labels, keyboard support, valid ARIA | Once there are real pages: `axe-core` via `vitest-axe` or Playwright, also in CI                                                         |
| `expo`                                         | None                                                                                                 | VoiceOver / TalkBack by hand; React Native Testing Library queries by role and label, e.g. `getByRole("button", { name: "Close menu" })` |
| `nest`                                         | Not applicable (API)                                                                                 |                                                                                                                                          |

`expo` has no accessibility lint plugin: `eslint-plugin-react-native-a11y` only supports ESLint up to 8 and hasn't had a release since November 2024 (its ESLint 9 pull request is still open).

For React Native, set `accessibilityRole` and `accessibilityLabel` on icon-only buttons, `accessibilityRole="header"` on titles, `accessibilityLabel` on text inputs, and give small touch targets a `hitSlop` so they reach about 44 points.

## CI

Every stack includes `.github/workflows/ci.yml`. It runs on pushes and pull requests to `main` with Node from `.nvmrc`, pnpm from `packageManager`, `pnpm install --frozen-lockfile`, and then:

| Stack        | Steps                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `expo`       | `check` (builds go through EAS)                                         |
| `nextjs`     | `check`, `build`                                                        |
| `react-vite` | `check`, `test`, `build`                                                |
| `nest`       | `check`, `test`, `test:e2e`, `build`                                    |
| `fullstack`  | `check`, `test`, backend `test:e2e` against a Postgres service, `build` |

GitHub only runs workflows from `.github/` at the repository root. When the target is inside an existing git repo but not its root (e.g. a challenge inside a monorepo), the scripts skip CI automatically.

Leave it out when creating or applying:

```bash
node ~/project-templates/scripts/new.mjs <stack> <name> --no-ci
node ~/project-templates/scripts/apply.mjs <stack> [projectDir] --no-ci
```

Remove it from an existing project:

```bash
rm .github/workflows/ci.yml
```

`.github/` can be deleted too if there's nothing else in it.

## What gets applied

1. Files in `shared/` (`.prettierrc`, `.nvmrc`, `.vscode/`)
2. Files in `templates/<stack>/files/` (overwrite `shared/` and generated files)
3. `templates/<stack>/template.json`:
    - `create`: command that generates the project (`{name}` is replaced)
    - `workspaces`: instead of `create`, builds each folder from another stack (`{ "backend": "nest" }`) and applies this template at the root
    - `workspaceDependencies`, `workspacePackage`: packages and `package.json` changes per workspace
    - `copyFiles`: files copied once if the target doesn't exist (e.g. `.env.example` → `.env`)
    - `removeFiles`, `removeDependencies`: generated things that are not wanted
    - `replace`: text replacements in generated files (`{name}` in `to` becomes the project folder name)
    - `devDependencies`, `installCommand`: packages to install
    - `moveToDevDependencies`: packages the install command put into `dependencies`
    - `package`: merged into `package.json` (scripts, engines, …)
4. `packageManager` and `devEngines` with the installed pnpm version
5. `pnpm lint:fix`, `pnpm format`, `pnpm check`

`apply.mjs` converts an npm project first: `pnpm import` turns `package-lock.json` into `pnpm-lock.yaml`, then `package-lock.json`, `node_modules` and the old `scripts/install-if-changed.mjs` are deleted.

## Version pins

- `eslint@^9`: `eslint-plugin-import` (import sorting) and `eslint-plugin-react` (in `eslint-config-expo`) don't support ESLint 10 yet. npm picked 9 because of their peer ranges, pnpm installs the latest version unless it's pinned
- `typescript@~6.0` in `react-vite`: `typescript-eslint` doesn't support TypeScript 7 yet
- No `verbatimModuleSyntax` in `nest`: NestJS dependency injection reads the types of decorated constructor parameters at runtime, so those imports must stay value imports

Remove these pins when the tools catch up.

## pnpm

All stacks use pnpm. Its store keeps every package version once on disk and links it into each project's `node_modules`, instead of a full copy per project.

- Install pnpm once with Homebrew, so it doesn't depend on the Node version. pnpm switches to the version in `packageManager` by itself.
- `devEngines.packageManager` blocks `npm` and `npx` in the project (`EBADDEVENGINES`). Use `pnpm dlx` for one-off tools and `pnpm exec` for local ones.
- `onFail` is `download`, not `error`: hosts like Vercel preinstall an older pnpm, which then downloads the pinned version instead of failing.
- pnpm doesn't run install scripts of dependencies until they are allowed. When an install stops with `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds` (or add the package under `allowBuilds` in `pnpm-workspace.yaml`) and run the command again. `create-next-app` already writes these decisions for `sharp` and `unrs-resolver`.
- Settings live in `pnpm-workspace.yaml`, also in single-package projects. `.npmrc` is only for registry and auth.
- `expo` uses pnpm's default (isolated) `node_modules`, which Metro supports since SDK 54.
- `expo-doctor` runs `npm explain` internally, which the npm block stops. Run it with `pnpm expo-doctor`, which sets `npm_config_force=true` so npm only warns. The script isn't called `doctor` because `pnpm doctor` is a built-in pnpm command that would run instead.

| npm                             | pnpm                                  |
| ------------------------------- | ------------------------------------- |
| `npm install`                   | `pnpm install`                        |
| `npm ci`                        | `pnpm install --frozen-lockfile`      |
| `npm install -D <pkg>`          | `pnpm add -D <pkg>`                   |
| `npm run <script>`              | `pnpm <script>`                       |
| `npx <tool>`                    | `pnpm dlx <tool>` / `pnpm exec <bin>` |
| `npm run <script> -w backend`   | `pnpm --filter backend <script>`      |
| `npm run <script> --workspaces` | `pnpm -r <script>`                    |

## Monorepos

When VS Code is opened at a monorepo root, put the `shared/.vscode` files there too and add `"prettier.requireConfig": true` to the root `settings.json`, so only projects with a `.prettierrc` get formatted on save.

## Changing or adding a template

1. Edit the files in `shared/` or `templates/<stack>/`
2. Test with a throwaway project:
    ```bash
    cd "$(mktemp -d)" && node ~/project-templates/scripts/new.mjs <stack> test-app
    ```
3. A new stack only needs a folder in `templates/` with a `template.json` and optional `files/`
