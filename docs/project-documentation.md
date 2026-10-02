# Imari — Project Documentation

## 1. Description

**Imari** is a personalised financial-literacy learning platform designed for university students in Rwanda (pilot: ALU cohort, Kigali). Students take a diagnostic assessment, receive tailored learning modules based on their weak competency domains, track progress, and — once they master a competency — earn a verifiable micro-credential anchored on the Ethereum blockchain.

Key features:

- **Diagnostic assessment** — the backend scores attempts server-side and maps results to "weak domains".
- **Recommendation engine** — published modules in weak domains are recommended, ordered by ascending score (threshold configurable by admins, default 60).
- **Learning modules** — lessons, activities and quizzes with progress tracking.
- **Micro-credentials** — once competency criteria are met, a credential (`id hash` + `content hash` + status) is issued and its hash is anchored in the `ImariCredentialRegistry` smart contract (local Hardhat chain in dev, Sepolia testnet in production). Employers/verifiers can check authenticity at `GET /v1/verify/:credentialId`.
- **Admin console** — invites, roster, course editor, credential revocation/reinstatement (also updates on-chain status), threshold settings and evaluation metrics.

## 2. GitHub repository

https://github.com/Kodedbykenzie/project_defence

## 3. Environment setup

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20 LTS recommended (dev has been tested on v23) |
| npm | 10+ |
| PostgreSQL | 15+ (local Homebrew install or Supabase) |
| Git | any recent |

### Clone & install

```bash
git clone https://github.com/Kodedbykenzie/project_defence.git
cd project_defence
cd frontend   && npm install
cd ../backend && npm install
cd ../blockchain && npm install
```

### Database

```bash
# Apply migrations in order, then seed reference data
psql -d imari -f database/migrations/0001_init.sql   # repeat for each migration
psql -d imari -f database/seed/0001_reference_data.sql
# or via the backend scripts:
cd backend && npm run db:setup
```

### Environment variables

- `backend/.env` — copy from `backend/.env.example`: `DATABASE_URL`, `JWT_SECRET`, `APP_ORIGIN`, `GOOGLE_CLIENT_ID` (optional), `SEPOLIA_RPC_URL`, `ISSUER_PRIVATE_KEY`, `CREDENTIAL_CONTRACT_ADDRESS`.
- `blockchain/.env` — for Sepolia deployment only: `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`.
- `frontend/.env` — copy from `frontend/.env.example`: `VITE_API_URL=http://localhost:4000`, `VITE_RPC_URL`, `VITE_CONTRACT_ADDRESS`.

> For local development set `SEPOLIA_RPC_URL=http://127.0.0.1:8545` and use Hardhat account #0's private key as `ISSUER_PRIVATE_KEY`.

### Run the full stack

```bash
cd blockchain && npm run node          # terminal 1 — local chain :8545
cd blockchain && npm run deploy:local  # terminal 2 — deploy registry, copy address to backend/.env
cd backend    && npm run dev           # terminal 3 — API :4000
cd frontend   && npm run dev           # terminal 4 — UI   :5173
```

Demo accounts: student `aline@alustudent.com`, admin `admin@imari.rw`, password `demo1234`, invite `ALU-PILOT`.

## 4. Designs

- **Figma mockups** — _(insert link to your Figma file)_
- **System diagram**:

```
React + TS client ──► Backend API ──► PostgreSQL (Supabase)   ← all personal & learning data
       │                   │
       │                   └──► Credential service ──► Sepolia: ImariCredentialRegistry
       └──► /v1/verify (public) ──────────────────────┘   ← id hash + content hash + status only
```

- **Screenshots** (captured from the running app):

| Student | Admin |
|---|---|
| ![Student dashboard](screenshots/student-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |
| ![Assessment](screenshots/assessment.png) | ![Admin students](screenshots/admin-students.png) |
| ![Modules](screenshots/modules.png) | ![Admin credentials](screenshots/admin-credentials.png) |
| ![Progress](screenshots/progress.png) | ![Admin invites](screenshots/admin-invites.png) |
| ![Credentials](screenshots/credentials.png) | ![Admin modules](screenshots/admin-modules.png) |
| ![Public verify](screenshots/verify.png) | |

## 5.0 Data visualization, security & schematic design (defence requirements)

### 5.1 Data visualization

The local Hardhat chain can be visualised by dumping its transaction graph. Run:

```bash
cd blockchain && npx hardhat run scripts/visualize.ts --network localhost
```

This prints every block/transaction and emits a **Graphviz DOT** description you can paste into [GraphvizOnline](https://dreampuf.github.io/GraphvizOnline/):

```
digraph tx {
  "0xf39F…2266" -> "contract-creation" [label="blk 1"];
  "0xf39F…2266" -> "0x5FbD…0aa3"       [label="issue, blk 2"];
  "0xf39F…2266" -> "0x5FbD…0aa3"       [label="revoke, blk 3"];
}
```

The contract's events (`Issued`, `Revoked`, `Reinstated`) can also be plotted as a timeline — our backend watcher (`backend log: [watcher] subscribed to registry events`) already consumes them.

**Consensus algorithms:** the local dev node auto-mines per transaction (effectively PoA on a single node); production runs on **Ethereum Sepolia, which uses Proof of Stake** with ~12-second slots.

### 5.2 Security measures

| Area | Measure | Evidence |
|---|---|---|
| On-chain privacy | Only `keccak256(credentialId)` + `contentHash` + status stored — no personal data | `ImariCredentialRegistry.sol` |
| Access control | `onlyOwner` / `onlyIssuer` modifiers; `setIssuer` rotates the hot wallet | contract |
| Pause switch | `pause()`/`unpause()` blocks issuance/revocation in an incident | contract + 8-test suite |
| Tamper evidence | `verify()` recomputes the presented hash against the stored one | contract |
| API auth | HS256 JWT access + refresh rotation | `backend/src/auth-plugin.ts` |
| Rate limiting | Global limit + stricter auth limits | `backend/src/app.ts` |
| HTTP security | helmet headers; CORS restricted to `APP_ORIGIN` | `backend/src/app.ts` |
| DB security | Parameterised queries, RLS policies, eligibility triggers | `database/migrations/0003,0004` |
| Key hygiene | `.env` untracked; separate deployer vs issuer keys; testnet only | `.gitignore`, `.env.example` |

### 5.3 Schematic design (system components & interactions)

*("PCB" is a hardware concept; for this software project we present the equivalent: the component schematic and its interaction matrix.)*

| From | To | Interface | Purpose |
|---|---|---|---|
| React client | Backend API | HTTPS JSON `/v1/*` | auth, modules, progress, credentials |
| React client | Ethereum | JSON-RPC (read-only) | fallback `verify()` from the browser |
| Backend | PostgreSQL | `pg` SQL client | users, progress, credentials persistence |
| Backend | Ethereum | ethers.js transactions | `issue` / `revoke` / `reinstate` |
| Contract | Watchers | event logs | backend event subscription |

**Credential lifecycle sequence:**

```mermaid
sequenceDiagram
  participant S as Student
  participant F as Frontend
  participant B as Backend
  participant DB as Postgres
  participant C as Contract
  S->>F: completes module/quiz
  F->>B: POST progress
  B->>DB: module_progress update
  DB-->>B: criteria met
  B->>C: issue(keccak(id), contentHash)
  C-->>B: txHash
  B-->>F: credential + txHash
  F-->>S: Credential issued
  S->>F: opens /verify
  F->>B: GET /v1/verify/:id
  B->>DB: record lookup
  B->>C: verify(idHash, hash)
  C-->>B: (status, matches)
```

## 5. Deployment plan

| Layer | Target | Steps |
|---|---|---|
| Database | Supabase (managed Postgres) | Create project, run migrations via SQL editor or `DATABASE_URL` + `npm run db:migrate`, enable RLS policies |
| Blockchain | Ethereum Sepolia testnet | Fund deployer wallet with Sepolia ETH (faucet), `npm run deploy:sepolia`, verify contract on Etherscan with `ETHERSCAN_API_KEY`, set `platform_settings.credential.chain_id = 11155111` |
| Backend | Node 20 host (Render / Railway / Fly.io / VPS) | `npm run build && npm start`, set env vars, point `DATABASE_URL` at Supabase, `ISSUER_PRIVATE_KEY` + `CREDENTIAL_CONTRACT_ADDRESS` on Sepolia |
| Frontend | Static hosting (Vercel / Netlify) | `npm run build`, publish `dist/`, set `VITE_API_URL` to the backend, `VITE_RPC_URL` to a Sepolia RPC |
| Auth & secrets | — | Generate strong `JWT_SECRET` / `RESET_CODE_PEPPER`, restrict `APP_ORIGIN`, rotate keys; never commit `.env` |

**Cost & risk notes:** Sepolia is free (testnet) so no real gas costs; Postgres + static hosting both have free tiers. Fallback: if the chain is unreachable, credentials remain `pending` in the DB and can be re-anchored later.
