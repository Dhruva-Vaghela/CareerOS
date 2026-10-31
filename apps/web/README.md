# CareerOS Web

The CareerOS web application is a React 19, TypeScript, and Vite frontend. It provides public landing, login, registration, and password recovery pages, along with authenticated onboarding, dashboard, and profile pages.

## Development

From the repository root, start the frontend only with:

```bash
npm run dev --workspace=@careeros/web
```

Vite serves the app at `http://localhost:5173`. To run the frontend with its backend services, use `npm run dev` from the repository root. See the root [SetUpGuide.md](../../SetUpGuide.md) for environment configuration and setup instructions.

## Build and lint

Run these commands from the repository root:

```bash
npm run build --workspace=@careeros/web
npm run lint --workspace=@careeros/web
```

The Vite development server proxies configured `/api` and `/api/v1/*` requests to local backend services. The proxy targets are defined in `vite.config.ts`.
