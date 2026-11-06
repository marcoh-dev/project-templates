# PROJECT_NAME

## Tech Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** NestJS, TypeORM
- **Database:** PostgreSQL (Docker)

## Requirements

- Node.js 24 (see `.nvmrc`, run `nvm use`)
- Docker

## Setup

All commands run from the repository root. The root is an npm workspace for `frontend` and `backend`, so don't run `npm install` inside a subfolder.

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm run dev
```

`npm run dev` starts the database and both apps:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Scripts

```bash
npm run dev           # database + backend + frontend
npm run db:up         # start the database
npm run db:down       # stop the database
npm run db:reset      # delete the database, start it fresh and run all migrations
npm run lint          # ESLint in both workspaces
npm run lint:fix      # ESLint with auto-fix
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
npm run typecheck     # tsc in both workspaces
npm run check         # lint + format:check + typecheck
npm test              # unit tests
npm run build         # build both workspaces
npm run sync          # switch to main, pull, install if needed, start the database, run migrations
npm run sync:branch   # merge main into the current branch (without committing), then the same
```

`sync` runs `npm ci` only when `package-lock.json` changed since the last install. `sync:branch` prepares the merge but doesn't commit it, so you can check it first (`git merge --abort` undoes it). `db:reset` deletes all local data, for example when the database no longer matches the migrations after switching branches.

Workspace-specific commands use `-w`:

```bash
npm install <package> -w frontend
npm run test:e2e -w backend          # needs the database
```

## Migrations

Entities are files named `*.entity.ts` in `backend/src`. Migrations are generated from the compiled code in `backend/dist`:

```bash
npm run migration:generate -w backend -- src/migrations/AddUsers
npm run migration:run -w backend
npm run migration:revert -w backend
npm run migration:show -w backend
```

## CI

`.github/workflows/ci.yml` runs `check`, the unit tests, the backend e2e tests against a Postgres service, and the build on every push and pull request to `main`.
