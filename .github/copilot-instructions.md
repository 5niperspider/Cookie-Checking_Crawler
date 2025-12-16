# Copilot Instructions for Cookie-Checking Crawler

## Project Overview
**Cookie-Checking Crawler** is a cookie analysis platform that examines how browser configurations (JavaScript enabled, cookie banners, adblockers) affect third-party and first-party cookie tracking. It consists of:
- **Backend (NestJS)**: API server at `apps/api/` that manages crawling sessions and serves cookie data
- **Frontend (Angular 20)**: SPA at `apps/frontend/` for interactive filtering, visualization, and analysis
- **Database**: PostgreSQL (configured in docker-compose) for persistent session and cookie storage

**Current Status**: Early-stage monorepo (branch `11-fe-analytics-dashboard`). Bootstrap-phase architecture; core features still in development.

## Architecture & Data Flow
```
User (Frontend) → NestJS API (`api:serve`) → PostgreSQL
                  ↓
           Puppeteer Browser Automation
                  ↓
           Captures: Cookies, Domain, Session metadata
```

### Key Integration Points
- **Frontend → Backend**: HTTP requests to `http://localhost:3000/api/*` (see `apps/api/src/app/app.controller.ts`)
- **Backend → Database**: Not yet wired; schema/migrations pending
- **Frontend Build**: Uses Angular CLI via Nx; produces `dist/apps/frontend` (production-optimized bundle)
- **Backend Build**: Webpack + TypeScript compilation; runs as Node.js process on port 3000

## Tech Stack & Versions
| Layer | Tech | Key Packages |
|-------|------|--------------|
| Backend | NestJS 11, TypeScript 5.9, Node/Webpack | `@nestjs/{common,core,platform-express}` |
| Frontend | Angular 20, TypeScript 5.9, RxJS 7.8 | `@angular/{core,forms,router,common}` |
| Styling | TailwindCSS 4.1, SCSS | Postcss, Tailwind utilities |
| Charts | Chart.js 4.5 | For cookie data visualization |
| Testing | Jest 30, SWC | ESM transpilation, unit tests |
| Build Tool | Nx 22.1, Webpack 5 | Monorepo orchestration & bundling |

## Development Workflows

### Start Both Services (Recommended)
```powershell
npm run start
```
This starts both backend and frontend in development mode:
- API: `http://localhost:3000/api` (Webpack watch mode)
- Frontend: Angular dev server on default port (typically 4200)

### Individual Services
- **Backend only**: `nx serve api` (builds + runs via `@nx/js:node`)
- **Frontend only**: `nx serve frontend` (Angular dev server)
- **Build**: `nx build api` or `nx build frontend`

### Testing & Linting
- **Run tests**: `nx test <app-name>` (Jest with SWC transpiler)
- **Run linter**: `nx lint <app-name>` (ESLint with Nx plugin)
- **Format code**: `npx prettier --write .`

### Database Setup
```powershell
docker-compose up -d
```
Starts PostgreSQL (port 5432, credentials in docker-compose.yml) and Adminer UI (port 8080). **No schema/migrations yet** — backend integration pending.

## Monorepo Structure & Conventions

### Nx Configuration
- **Root config**: `nx.json` defines plugins (Webpack, ESLint, Jest) and target defaults
- **App configs**: Each app has `project.json` (targets like `build`, `serve`, `test`) and `tsconfig.json`
- **No path aliases yet** in `tsconfig.base.json` — add under `compilerOptions.paths` as libraries are created

### Important Files by Purpose
| Purpose | Files |
|---------|-------|
| API logic | `apps/api/src/app/app.{controller,service}.ts` |
| Frontend components | `apps/frontend/src/app/app.{ts,routes.ts,html}` |
| Configuration | `apps/frontend/src/app/app.config.ts` (Angular config), `apps/api/src/main.ts` (bootstrap) |
| Styling | `apps/frontend/src/styles.scss` (globals), component `.scss` files |
| Tests | `**/*.spec.ts`, configured in per-app `jest.config.cts` |

### Angular-Specific Patterns
- **Standalone components**: All Angular components use `standalone: true` (e.g., `App` in `apps/frontend/src/app/app.ts`)
- **Routing**: Empty routes array at `apps/frontend/src/app/app.routes.ts` — add routes here as features expand
- **Bootstrapping**: `bootstrapApplication()` with config providers (Angular 14+ standalone API)
- **Styling**: Global styles in `styles.scss`; component styles co-located with `.scss` files

### NestJS Patterns
- **Modules**: `AppModule` imports controllers and providers; add new modules here
- **Controllers**: Use decorator-based routing (`@Get()`, `@Post()`) in `AppController`
- **Services**: Injected via constructor; contain business logic
- **Global prefix**: All routes prefixed with `/api` (set in `main.ts`)

## Code Standards

### TypeScript Strict Mode
- `"strict": true` in tsconfig (inherited from `tsconfig.base.json`)
- Prefer explicit types; avoid `any`

### ESLint Rules
- `@nx/enforce-module-boundaries`: Prevents circular dependencies between apps/libs
- Config at `eslint.config.mjs` (ESLint flat config v9)
- Run `nx lint <app>` before committing

### Prettier Formatting
- Config: `.prettierrc` and `.prettierignore`
- Format before commit: `npx prettier --write <file>`

## Known Limitations & TODOs
- ❌ **Database integration**: Schema and migrations not yet implemented
- ❌ **API endpoints**: Only GET `/` endpoint exists; cookie CRUD endpoints pending
- ❌ **Frontend routes**: Empty `appRoutes` array — waiting on backend API
- ❌ **Puppeteer integration**: Not yet wired into backend service
- ⚠️ **E2E tests**: `apps/api-e2e` exists but no meaningful tests (see `api.spec.ts`)
- ⚠️ **No shared libraries yet**: Code is app-specific; consider extracting shared types/services as scope grows

## Common Tasks for Agents

### Adding an API Endpoint
1. Create controller method in `apps/api/src/app/app.controller.ts` with `@Get()`, `@Post()`, etc.
2. Add service logic in `apps/api/src/app/app.service.ts` (use dependency injection)
3. Run `nx serve api` and test with REST client or curl
4. Update E2E tests in `apps/api-e2e/src/api/api.spec.ts`

### Adding Frontend Features
1. Create component/service in `apps/frontend/src/app/` with `standalone: true`
2. Add route to `apps/frontend/src/app/app.routes.ts`
3. Use `HttpClient` (from `@angular/common/http`) to call backend `/api` endpoints
4. Add styling (SCSS) and use Tailwind utilities for responsive design
5. Test with `nx serve frontend`

### Debugging
- **Backend**: Logs via `Logger.log()` in NestJS; check terminal output from `nx serve api`
- **Frontend**: Browser DevTools console; Angular Devtools extension recommended
- **Database**: Use Adminer UI (`http://localhost:8080`) to inspect PostgreSQL tables once schema is created

### Commit & Verification
```powershell
nx lint api
nx lint frontend
nx test api
nx test frontend
git add .
git commit -m "feat: description"
```

## References
- Nx Docs: https://nx.dev
- Angular Docs: https://angular.io (v20 features)
- NestJS Docs: https://docs.nestjs.com
- Project README: See `README.md` for research methodology and domain context
