# project-templates

My project setup for new and existing projects: strict TypeScript, Prettier, ESLint with sorted imports and `@/` path aliases, and VS Code format/fix on save.

The templates don't contain whole projects. Each project is created with the official tool for its stack (so it's always up to date), then the files and settings from this repo are applied on top.

## Stacks

| Stack        | Created with                                                     | Notes                                            |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `expo`       | `create-expo-app` (blank-typescript), code moved to `src/`       | ESLint via `expo lint`                           |
| `nextjs`     | `create-next-app` (App Router, Tailwind, React Compiler, `src/`) | Tailwind class sorting via Prettier plugin       |
| `react-vite` | `create-vite` (react-ts)                                         | oxlint replaced with ESLint                      |
| `nest`       | `@nestjs/cli new` (ESM, Vitest)                                  | oxlint replaced with ESLint (type-checked rules) |
| `fullstack`  | `nextjs` in `frontend/` + `nest` in `backend/` as npm workspaces | Postgres (Docker), TypeORM, GitHub Actions CI    |

`fullstack` is set up like food-swap: one `npm install` and `npm run dev` at the root start the database, the backend (port 3000) and the frontend (port 5173). The generated project has its own README with all commands.

## Requirements

- Node 24 (`nvm use 24`)
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
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
npm run typecheck     # tsc
npm run check         # lint + format:check + typecheck
```

Rules in every stack:

- Prettier: tabs (width 4), print width 100, double quotes
- Imports grouped (packages, `@/…`, relative) and sorted alphabetically, no duplicates
- `../` imports are errors, use `@/…` instead (`./` and subfolders are fine)
- `any` and unused variables/imports are errors
- TypeScript `strict` and `noUncheckedIndexedAccess`; `verbatimModuleSyntax` everywhere except `nest`
- VS Code: Prettier formats on save, ESLint fixes on save, auto-imports prefer `@/…`
- Node 24 via `.nvmrc` and `engines`
- GitHub Actions CI (see below)

## CI

Every stack includes `.github/workflows/ci.yml`. It runs on pushes and pull requests to `main` with Node from `.nvmrc`, `npm ci`, and then:

| Stack        | Steps                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `expo`       | `check` (builds go through EAS)                                         |
| `nextjs`     | `check`, `build`                                                        |
| `react-vite` | `check`, `build`                                                        |
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
4. `npm run lint:fix`, `npm run format`, `npm run check`

## Version pins

- `eslint@^9`: `eslint-plugin-import` (import sorting) doesn't support ESLint 10 yet
- `typescript@~6.0` in `react-vite`: `typescript-eslint` doesn't support TypeScript 7 yet
- No `verbatimModuleSyntax` in `nest`: NestJS dependency injection reads the types of decorated constructor parameters at runtime, so those imports must stay value imports

Remove these pins when the tools catch up.

## Monorepos

When VS Code is opened at a monorepo root, put the `shared/.vscode` files there too and add `"prettier.requireConfig": true` to the root `settings.json`, so only projects with a `.prettierrc` get formatted on save.

## Changing or adding a template

1. Edit the files in `shared/` or `templates/<stack>/`
2. Test with a throwaway project:
    ```bash
    cd "$(mktemp -d)" && node ~/project-templates/scripts/new.mjs <stack> test-app
    ```
3. A new stack only needs a folder in `templates/` with a `template.json` and optional `files/`
