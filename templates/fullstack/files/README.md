# PROJECT_NAME

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** NestJS, TypeORM
- **Database:** PostgreSQL (Docker)

## Requirements

- Node.js 24 (see `.nvmrc`, run `fnm use`)
- pnpm (`brew install pnpm`); npm is blocked in this project
- Docker

## Setup

All commands run from the repository root. The root is a pnpm workspace for `frontend` and `backend`, so don't run `pnpm install` inside a subfolder.

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
pnpm dev
```

`pnpm dev` starts the database and both apps:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Scripts

```bash
pnpm dev           # database + backend + frontend
pnpm db:up         # start the database
pnpm db:down       # stop the database
pnpm db:reset      # delete the database, start it fresh and run all migrations
pnpm lint          # ESLint in both workspaces
pnpm lint:fix      # ESLint with auto-fix
pnpm format        # Prettier, write
pnpm format:check  # Prettier, check only
pnpm typecheck     # tsc in both workspaces
pnpm check         # lint + format:check + typecheck
pnpm test          # unit tests
pnpm build         # build both workspaces
pnpm sync          # switch to main, pull, install, start the database, run migrations
pnpm sync:branch   # merge main into the current branch (without committing), then the same
```

`sync:branch` prepares the merge but doesn't commit it, so you can check it first (`git merge --abort` undoes it). `db:reset` deletes all local data, for example when the database no longer matches the migrations after switching branches.

Workspace-specific commands use `--filter`:

```bash
pnpm add <package> --filter frontend
pnpm --filter backend test:e2e       # needs the database
```

When an install stops with `ERR_PNPM_IGNORED_BUILDS`, a new dependency wants to run an install script. Run `pnpm approve-builds` to allow or deny it; the decision is saved under `allowBuilds` in `pnpm-workspace.yaml`.

## Migrations

Entities are files named `*.entity.ts` in `backend/src`. Migrations are generated from the compiled code in `backend/dist`:

```bash
pnpm --filter backend migration:generate src/migrations/AddUsers
pnpm --filter backend migration:run
pnpm --filter backend migration:revert
pnpm --filter backend migration:show
```

## CI

`.github/workflows/ci.yml` runs `check`, the unit tests, the backend e2e tests against a Postgres service, and the build on every push and pull request to `main`.

## Issues

New issues use the user story template in `.github/ISSUE_TEMPLATE/user-story.md`: value proposition, description, acceptance criteria and tasks.
