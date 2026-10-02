# End-to-end integration guide

How to move the prototype (browser storage) onto the real stack without changing the UI.

## 1. Database

1. Create a Supabase project (region closest to Kigali, e.g. `eu-west`).
2. Apply `database/migrations/0001…0004` in order, then `database/seed/0001_reference_data.sql`.
3. Import content: each entry in `frontend/src/data/modules.ts` → `modules` (+ `lessons`, `module_objectives`, `activities`, `questions` with `module_id`); `frontend/src/data/questions.ts` → `questions` with `module_id = null`.
4. Enable Google in Supabase Auth; add `https://<app>/login` as a redirect URL.

## 2. Blockchain

1. Deploy `blockchain/contracts/ImariCredentialRegistry.sol` to Sepolia (see `blockchain/README.md`).
2. Fund the issuer wallet with Sepolia ETH; call `setIssuer(backendWallet, true)` if it differs from the deployer.
3. Record the address in backend env and `platform_settings.credential.chain`.

## 3. Backend

Implement the endpoints in `backend/openapi.yaml`. Keep scoring and the recommendation rule server-side so the accuracy metric is computed against one implementation.

## 4. Frontend

Add `@supabase/supabase-js` to `frontend/package.json` and create `frontend/src/utils/api.ts` with a typed client. Then replace context internals — **components don't change**:

| File | Replace |
|---|---|
| `frontend/src/contexts/AuthContext.tsx` | localStorage accounts → Supabase Auth session; `register` calls `/auth/register` with `inviteCode` |
| `frontend/src/contexts/PlatformContext.tsx` | `usePersistentState` → React Query / SWR fetches per resource; actions → API calls |
| `frontend/src/hooks/useNotifications.ts` | Supabase Realtime subscription on `imari.notifications` |
| `frontend/src/contexts/PreferencesContext.tsx` | Mirror `update()` to `PUT /me/preferences`; cookie choice → `POST /me/cookie-consent` |
| `frontend/src/utils/credential.ts` | Simulated hash → `ethers.keccak256(toUtf8Bytes(payload))`; verification → `GET /verify/:id` |

Routes already use slugs (`frontend/src/utils/slug.ts`), matching `modules.slug`.

## 5. Privacy & consent

- Cookie consent is required before optional storage; essential storage (session, consent) is always on. Policy at `/legal/cookies`, version `2026-09`.
- Research consent is captured at sign-up (`student_profiles.research_consent`) and can be withdrawn in Settings → Privacy (sets `consent_withdrawn_at`; exclude from `v_knowledge_gain` exports).
- Never send names, emails, scores or answers to the contract.

## 6. Mobile & accessibility checklist

- Viewport uses `viewport-fit=cover`; layouts pad with `env(safe-area-inset-*)` (top bar, bottom nav, sheets, floating language pill).
- Root font is 14px on phones, 15px from 768px; users choose Small / Default / Large in Settings.
- Inputs render at 16px on phones to prevent iOS zoom.
- The side panel shows from 768px (tablets) with an icon-only sidebar below 1280px.
- Modals are bottom sheets on phones, trap focus, lock scroll and close on Escape.

## 7. Evaluation hooks (Table 7)

| Metric | Source |
|---|---|
| Knowledge improvement | `v_knowledge_gain` → paired t-test / Wilcoxon |
| Recommendation accuracy | `v_recommendation_accuracy.accuracy_pct` |
| Relevance | `recommendations.relevance`, `module_feedback.rating` |
| Task completion & errors | `event_logs` (`success`, `event`) |
| Response time | `assessment_attempts.recommendation_ms`, `event_logs.duration_ms` |
| Credentials | `v_credential_health`, `credential_verifications.latency_ms` |
