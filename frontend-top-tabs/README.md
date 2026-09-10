# Wanderfile · top tabs

Standalone frontend for the [top tabs](../frontend/design-lab/dashboard-pages/demos/01-top-tabs/home.html) theme. It does not import `frontend/src`. In development it proxies `/api` to the same `VITE_API_BASE_URL` as the current app (dev or prod).

```bash
cd frontend-top-tabs
cp ../frontend/.env.local .env.local   # or copy from .env.example
npm install
npm run dev
```

Open http://localhost:5180. Allow that origin in Clerk if sign-in is blocked.
