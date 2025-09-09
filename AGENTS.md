# Repository Guidelines

## Project Structure & Module Organization
- Root entry: `index.html`, `index.tsx`, `App.tsx`.
- Source modules in top-level folders:
  - `components/` UI components (prefer one component per file).
  - `context/` React Context providers/state.
  - `hooks/` custom React hooks (reusable logic).
  - `lib/` utilities and helpers.
  - `types.ts` shared TypeScript types; `constants.tsx` UI/constants.
- Import alias: use `@/` for root-relative imports (see `vite.config.ts`).

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server with HMR.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built app locally.
- Node 18+ recommended for Vite 6.

## Coding Style & Naming Conventions
- TypeScript is strict; prefer explicit types and avoid `any`.
- Indentation: 2 spaces; keep lines focused and readable.
- Strings: single quotes; include semicolons.
- React: functional components with hooks; no class components.
- Filenames:
  - Components: `PascalCase.tsx` (e.g., `ColorPicker.tsx`).
  - Hooks: `useSomething.ts` in `hooks/`.
  - Context: `XContext.tsx` in `context/`.
  - Utilities: `camelCase.ts` in `lib/`.
- Exports: prefer named exports; default exports only for page/entry components.

## Testing Guidelines
- No test runner is configured. If adding tests, use Vitest + React Testing Library.
- Place tests alongside modules as `*.test.ts`/`*.test.tsx` or under `__tests__/`.
- Aim for component/unit tests around core tools (drawing, transforms) and reducers/state in `context/`.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`.
- Keep messages imperative and scoped: `feat(brush): support pressure taper`.
- PRs must include:
  - Summary of changes and rationale.
  - Linked issue (if any).
  - Screenshots/GIFs for UI changes.
  - Notes on breaking changes or migrations.

## Security & Configuration Tips
- Secrets/config: use `.env.local` (git-ignored). Example: `GEMINI_API_KEY=...`.
- Access env via `process.env.GEMINI_API_KEY` (mapped in `vite.config.ts`).
- Do not commit API keys or large assets; keep `dist/` and `node_modules/` out of VCS.

## Agent-Specific Notes
- Scope of this file is repository root. Follow alias `@/`, avoid renaming files without need, and keep diffs minimal and focused.
