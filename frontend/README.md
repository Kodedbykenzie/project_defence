# Frontend — React web client

Student and admin UI for Imari (React 18 + TypeScript + Vite + Tailwind). Prototype state lives in `src/contexts/` (localStorage); `docs/integration-guide.md` explains how to swap it for the real API without changing components.

```
frontend/
├── index.html          entry document
├── public/             static assets
├── src/
│   ├── index.tsx       bootstrap
│   ├── App.tsx         routes
│   ├── components/     ui, layout, auth, student, admin, notifications
│   ├── contexts/       Auth, Platform, Preferences (prototype state)
│   ├── data/           seed content: domains, modules, questions, i18n
│   ├── hooks/          useLearner, useNotifications, …
│   ├── pages/          auth, student, admin, legal
│   ├── types/          platform.ts — shared domain types
│   └── utils/          recommendation, credential, slug, …
├── tailwind.config.js  brand palette, Inter
├── tsconfig.json       strict
└── vite.config.ts
```

## Commands

Run from the repo root (npm workspace) or from `frontend/`:

```bash
npm run dev       # vite dev server
npm run build     # production build
npm run lint      # eslint
npm run preview   # preview the production build
```

## Routes

Public: `/login`, `/register?code=…`, `/forgot-password`, `/verify/:credentialId`, `/legal/cookies`.
Students: `/onboarding`, `/app/*` (dashboard, assessment, results, modules, progress, credentials, notifications, settings).
Admins: `/admin/*` (overview, modules editor, assessment, students, credentials, invites, notifications, settings).

Routing uses module slugs (`utils/slug.ts`), matching `modules.slug` in the database.
