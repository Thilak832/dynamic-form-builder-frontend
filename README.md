# Dynamic Form Builder: Frontend (React)

Web app for a **Google Forms-style dynamic form builder**: the form editor, the respondent view, and the responses views (summary charts, per question, per respondent, export).

> **Status: re-scoping in progress.** This repository was renamed from `tripforms-front-end`.
> - The code on `main` is still the earlier **TripForms** travel-booking version, described below.
> - It is being converted to the new scope. The plan (TPP v2.0) and wireframes are in the [backend repo `docs/`](https://github.com/Thilak832/dynamic-form-builder-backend/tree/main/docs).

Backend repo: **[dynamic-form-builder-backend](https://github.com/Thilak832/dynamic-form-builder-backend)**

**Current code (TripForms):**
- **Admins:** drag-and-drop form builder, publishing and versions, responses, analytics, admin panel.
- **Customers:** trip catalog, multi-page booking forms, My bookings.

**Stack:** React 18 · Vite · Redux Toolkit · React Router · Tailwind CSS · @hello-pangea/dnd · Recharts · Axios

## Run locally

Start the backend first (see its README), then:

```bash
npm install
npm run dev          # http://localhost:5000
```

- The API URL defaults to `http://localhost:8000`. If the API runs elsewhere, copy `.env.example` to `.env` and set `VITE_API_URL`, for example `http://localhost:8010`.
- Logins (password `demo1234`): `admin@demo.com` (Admin) and `customer@demo.com` (Customer).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 5000 |
| `npm test` | Vitest: rules engine tests |
| `npm run build` | Production build in `dist/` |

## Project layout

```
src/
  api/            axios client (token refresh) and endpoint helpers
  store/          Redux slices: auth, builder, ui
  lib/            logic.js (rules engine, mirrors the backend), fieldTypes, format, geo
  components/
    builder/      palette, canvas, properties panel, logic editor, modals
    renderer/     FormRenderer and inputs (files, signature, payment, rich text)
  pages/          admin pages, customer/ pages, auth/ pages, PublicForm
```

## Deploy (Vercel)

Import this repo in Vercel. The framework preset is **Vite**, and `vercel.json` handles SPA routing. Set `VITE_API_URL` to the backend URL, and add the Vercel domain to the backend's `CORS_ORIGINS`.
