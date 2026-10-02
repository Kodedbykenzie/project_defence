# Blockchain — proposal review findings & implementation notes

Prepared after auditing `proposal.md` against the implemented system (`blockchain/`, `backend/`, `frontend/`).
This document has two parts: (A) what is missing or imprecise in the proposal, with suggested corrections;
(B) the blockchain facts as implemented, so another agent can continue without re-reading the codebase.

---

## A. Findings on `proposal.md` (blockchain-related)

### A1. Section 3.4.4 / 3.4.5 — class diagram & sequence diagram under-specify the credential lifecycle
**Current text:** "The credential class exposes issue(), verify(), and revoke() operations" and Figure 7 shows a simple issue → store → later-verify flow.
**What exists / should exist:**
- Contract functions implemented: `issue(idHash, contentHash)`, `revoke(idHash)`, `reinstate(idHash)`, `get(idHash)`, `verify(idHash, presentedHash)`, `setIssuer(addr, bool)`, `transferOwnership(addr)`, `setPaused(bool)`.
- DB lifecycle states: `pending` (inserted, trigger-gated by eligibility) → `valid` (tx mined, tx_hash/block stored) → `revoked` → (optional) `valid` via `reinstate`.
- Failure/retry path: if the anchoring tx fails, the row stays `pending`; a retry sweeper re-anchors it.
- **Suggested correction to proposal:** add `reinstate`, `setIssuer`, `setPaused` to the contract surface and describe the `pending → valid → revoked` state machine (a small state diagram or text) in §3.4.4/3.4.5, including the retry behaviour on RPC failure. This strengthens the evaluation story (issuance success rate measurement).

### A2. §3.4.4 — hash privacy correction (important)
**Current text:** "generate a credential identifier and cryptographic hash, and submit only minimal verification information" — implies hashing the credential content.
**Risk:** `idHash = keccak256(id)` where `id = "IMR-XXXX-XXXX"` (8 characters from a 32-symbol alphabet, ≈ 2^40 space) is enumerable in principle. An attacker could pre-compute hashes for candidate IDs and probe the contract to confirm which credentials exist — a weak link in the privacy claim (§3.6: no personal data on-chain).
**Suggested correction to proposal:** state explicitly that the on-chain key is `keccak256(id)` where `id` is a non-sequential, entropy-containing credential id, and recommend (optionally) HMAC-style salting with a server-side pepper (e.g. `keccak256(id || pepper)`) if indistinguishability against enumeration is required. Also note that `verify()` only returns a boolean for `status == Valid && hash matches` — it never reveals the stored hash.

### A3. §3.4.5 Sequence diagram — missing revocation/reinstatement and error handling
- Figure 7 should include the admin actor path: admin → revoke request → chain `revoke()` → DB row → `revoked_at`.
- It should also show the public verifier querying `verify(idHash, presentedHash)` on-chain and logging the verification (latency, ip hash) in `credential_verifications`.
- **Suggested correction:** extend Figure 7 to a two-panel sequence: (1) issuance with pending state; (2) verification + revocation paths. Mention that revocation IS recorded on-chain (status flips on the registry), not just in the DB.

### A4. §3.5 Development Tools — "MetaMask … during development for testnet interactions"
**Correction:** the prototype anchors credentials **server-side** with an issuer wallet (ethers `Wallet` managed by the backend, configured via `ISSUER_PRIVATE_KEY`). End users do not need a wallet; a separate verifier only calls the public `verify()` view function (no signature, no gas). **Suggested correction:** replace/augment the MetaMask sentence with: "transactions to the registry are signed by the backend's issuer wallet (ethers Wallet); verifiers interact with the contract read-only via public RPC; MetaMask/Remix are optional for manual inspection."

### A5. §3.5 — "Hardhat or Remix"
**Correction:** the implemented project uses **Hardhat + TypeScript + ethers v6 + TypeChain** (`blockchain/`), with 8 automated tests covering: issuer authorization, duplicate issuance, tamper detection, revoke/reinstate semantics, unknown-credential handling, ownership, and pause behaviour. **Suggested correction:** name Hardhat specifically and that the same test file also serves as the §3.5 test specification (already listed: issuance success, duplicate handling, retrieval/verification, revocation, altered-credential detection, invalid requests, re-issue after revoke). Add "pause blocks issue/revoke/reinstate" to that list.

### A6. Evaluation metrics (Table 7) — one gap
- "Altered-credential detection" and "revocation correctness" exist as rows. Add a row for **"Pause/incident behaviour"** (issuance rejected while paused, allowed after unpause) only if you keep the `setPaused` feature in the deployed contract.
- Also clarify that **transaction/contract errors** in Table 7 maps to two counters: failed anchor attempts (row stays `pending`, retried) and failed revoke/reinstate txs (DB does not claim a state the chain rejects — request is rejected with `CHAIN_ERROR`).

### A7. Functional requirements (Table 5) — fine, two small additions
- FR10 is accurate. Optionally add an FR10a: "credential issuance may be asynchronous — status returns `pending` and becomes `valid` once the transaction is mined."
- Note that the public verifier does **not** need an account (permissionless read), which supports FR10's "verify … by a separate verifier".

### A8. §3.6 Ethics — mostly correct; one precision
- Correctly states no names/scores on-chain, Sepolia testnet only, aggregate reporting.
- From the code: on-chain records are `keccak256(id)` + `contentHash` + timestamps + status only. The proposal should state this exact minimality (already implied; make it explicit: "no name, email, score, answer, or learner identifier is written on-chain").

### A9. What is intentionally NOT in the proposal (keep it that way)
- No NFTs, marketplaces, tokens, or DeFi on-chain.
- No client-side signing by students.
- No mainnet deployment.
These constraints appear scattered; a single short paragraph (e.g. in §3.4.4) stating the boundary would help the assessor.

---

## B. Blockchain as implemented (state of the repo)

### B1. Contract
- File: `blockchain/contracts/ImariCredentialRegistry.sol` (Solidity `^0.8.24`, MIT).
- Toolchain: Hardhat + ethers v6 + TypeChain, optimizer 200 runs.
- Tests: `blockchain/test/ImariCredentialRegistry.test.ts` — **8 passing** (`npx hardhat test`).
- ABI/artifact exported to `blockchain/exports/ImariCredentialRegistry.json`, copied to `frontend/src/contracts/`.
- Local deployment: `npx hardhat node` + `npx hardhat run scripts/deploy.ts --network localhost`. **Current local address: `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853`** (chain id 31337).
- Enum mapping: `Status { None=0, Valid=1, Revoked=2 }`.
- `verify(idHash, presentedHash)` returns `(status, matches)` where `matches == true` **only if** `status == Valid && contentHash == presentedHash`. Revoked credentials never match.
- Access control: `owner` deploys; `setIssuer` grants issuance rights; issuer wallet is the backend signer; `setPaused` freezes `issue/revoke/reinstate`; `transferOwnership` re-points owner.

### B2. Canonical hashing (must be identical everywhere)
```
payload     = `${id}|${learnerId}|${moduleId}|${competency}|${issuedAt}`  // issuedAt ISO-8601 UTC with ms
contentHash = keccak256(utf8(payload))      // stored in credentials.hash
idHash      = keccak256(utf8(id))           // used as the contract mapping key
```
- Backend implementation: `backend/src/lib/credential.ts` (ethers keccak256).
- Frontend implementation: `frontend/src/utils/credential.ts`.
- On-chain verify compares the presented hash to the stored hash; it never sees the id/learner/module.

### B3. Backend flow
- `POST /v1/modules/:slug/credential` (JWT, role student):
  1. `modules` row lookup; eligibility enforced by DB trigger `credentials_eligibility` (`P0001 = COMPETENCY_NOT_MET` → 409).
  2. Insert `credentials` row with `status='pending'`, `hash=contentHash`, `chain_id`, `contract_address`.
  3. Anchor on chain: real tx when `chainMode='sepolia'`, deterministic simulated hash otherwise (`chainMode='simulate'`).
  4. On receipt: row becomes `status='valid'`, `tx_hash`, `block_number`, `confirmed_at`.
  5. On anchor failure: row remains `pending`; `lib/watcher.ts` retry sweeper re-anchors every 30 s.
- `GET /v1/verify/:credentialId?hash=` (public): DB row, recomputes canonical hash, optional presented-hash comparison, logs to `credential_verifications` with latency + ip hash. Outcomes: `valid | revoked | mismatch | not_found`.
- `PATCH /v1/admin/credentials/:id` (admin): chain-first `revoke`/`reinstate`; if the chain reverts `InvalidStatus` because the on-chain state already matches the desired one, the DB **reconciles** to the chain (self-heal after a previous DB rollback).
- Chain watcher (`backend/src/lib/watcher.ts`): subscribes to `CredentialIssued/Revoked/Reinstated` and reconciles DB rows by matching `idHash(row.id)` to the event's indexed arg. **Demonstrated:** a direct on-chain `reinstate` flipped the DB row revoked→valid.
- Retry sweeper (same file): every 30 s, re-anchors rows where `status='pending' AND tx_hash IS NULL AND issued_at < now() - 15s`.

### B4. Frontend
- `/verify/:credentialId` calls `utils/verifyLive.ts`: prefers the API (`VITE_API_URL`), falls back to a direct contract read (`VITE_RPC_URL` + `VITE_CONTRACT_ADDRESS`), falls back to the local prototype context. The source is shown on the result card.
- Credential issuance in `PlatformContext` uses the API when `VITE_API_URL` is set, otherwise local prototype with real keccak hashes.

### B5. Environment switches
- Dev / no RPC: leave `SEPOLIA_RPC_URL`, `ISSUER_PRIVATE_KEY`, `CREDENTIAL_CONTRACT_ADDRESS` empty → `chainMode: simulate` (deterministic fake tx hashes, no chain).
- Local real chain: `cd blockchain && npm run node` (keep running), `npm run deploy:local`, put the printed address + a Hardhat account private key + `http://127.0.0.1:8545` into `backend/.env`, restart backend → `chainMode: sepolia` against localhost.
- Sepolia: `blockchain/.env` gets `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`; `backend/.env` gets `SEPOLIA_RPC_URL`, `ISSUER_PRIVATE_KEY`, `CREDENTIAL_CONTRACT_ADDRESS`, `CHAIN_ID=11155111`; then `cd blockchain && npx hardhat run scripts/deploy.ts --network sepolia`, paste the printed address into `backend/.env` + frontend env, restart backend. Update `platform_settings.credential.chain` accordingly.

### B6. Test matrix for §3.5 (all covered in `blockchain/test/ImariCredentialRegistry.test.ts`)
- owner can issue; non-issuer reverts `NotIssuer` ✔
- duplicate `issue` reverts `AlreadyIssued` ✔
- `verify` → `(Valid, true)` for the correct hash, `(Valid, false)` for an altered payload ✔
- `revoke` → `(Revoked, …)`, revoking twice reverts `InvalidStatus` ✔
- `reinstate` restores `Valid`, double reinstate reverts `InvalidStatus` ✔
- unknown id → `(None, false)` ✔
- only owner can `setIssuer`/`transferOwnership` ✔
- `setPaused` blocks issue/revoke/reinstate until unpaused ✔

### B7. Privacy & ethics (§3.6) — exact on-chain footprint
Only `idHash = keccak256(id)`, `contentHash`, `issuedAt`, `revokedAt`, `status` are stored on-chain. No `learnerId`, `moduleId`, `competency` string, name, email, score, or answer ever leaves the backend. `contentHash` is over a payload that includes the UUID learner id, so it is not reversible by brute force within the credential's lifetime.
- **Suggested improvement (not yet implemented):** optional server-side pepper mixed into `idHash`/`contentHash` if the examiner pushes on enumerability of `IMR-XXXX-XXXX` ids.

### B8. Limitations to state in the final report
- Proof-of-concept on Sepolia testnet; no mainnet floating-point of value; gas cost measured but not optimized beyond optimizer runs=200.
- The issuer wallet key in `backend/.env` is a hot key suitable for pilot, not production custody.
- No certificate revocation CRL-style off-chain distribution; verifiers must query the chain (or the API) at verification time.
- No zero-knowledge or DIDs — deliberately out of scope.

---

## C. Suggested edits to `proposal.md` (checklist)
1. §3.4.4: add `reinstate`, `setIssuer`, `setPaused`, `transferOwnership` to the contract function list.
2. §3.4.4/3.4.5: describe the `pending → valid → revoked` lifecycle and the failure/retry path.
3. §3.4.5: add admin revocation panel + verifier logging to Figure 7.
4. §3.5: replace "MetaMask … testnet interactions" with server-side issuer wallet (ethers) + read-only verifier.
5. §3.5: name Hardhat + ethers v6 + TypeChain specifically; list the 8 contract tests.
6. §3.6: state the exact on-chain footprint (id hash, content hash, timestamps, status only).
7. Table 7: add "pause blocks issuance" and clarify where `transaction/contract errors` are counted.
8. §3.3.4 / Table 5: add a line that issuance may return `pending` while mining and that verifiers need no account.
