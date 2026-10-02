# Blockchain — micro-credential registry (Ethereum Sepolia)

A deliberately small, secondary component. It is used **only after** a learner meets a module's competency criteria, and it stores **only** `keccak256(credentialId)`, a content hash and a status. Personal data, answers and scores stay in Postgres.

```
blockchain/
├── contracts/ImariCredentialRegistry.sol   issue · revoke · reinstate · get · verify
└── README.md
```

## Quickstart (local)

```bash
npm install
npx hardhat compile
npm test                 # 7 tests covering Chapter 3.5
npm run node             # local chain on :8545 (keep running)
npm run deploy:local     # prints the contract address
```

Then start the backend with `RPC_URL`, `ISSUER_PRIVATE_KEY` (a Hardhat account key) and `CREDENTIAL_CONTRACT_ADDRESS` set, and the frontend with `VITE_API_URL=http://localhost:4000`.

Optional: create `frontend/.env` with `VITE_API_URL=http://127.0.0.1:4000` (API + chain verify), plus `VITE_RPC_URL=http://127.0.0.1:8545` and `VITE_CONTRACT_ADDRESS=<deployed address>` for direct contract reads.

For Sepolia: copy `.env.example` to `.env` here and in `backend/`, fill in `SEPOLIA_RPC_URL`, `ISSUER_PRIVATE_KEY` / `DEPLOYER_PRIVATE_KEY`, `CREDENTIAL_CONTRACT_ADDRESS`, then `npm run deploy:sepolia` in `blockchain/` and set `chain_id = 11155111` and the address in `platform_settings.credential.chain`.

## Contract surface

| Function | Who | Purpose |
|---|---|---|
| `issue(idHash, contentHash)` | issuer | Anchor a new credential; reverts `AlreadyIssued` on duplicates |
| `revoke(idHash)` / `reinstate(idHash)` | issuer | Status change; emits events verifiers can watch |
| `verify(idHash, presentedHash)` | anyone (view) | Returns `(status, matches)` — detects altered credentials |
| `get(idHash)` | anyone (view) | Full record: `(idHash, contentHash, status, issuedAt, revokedAt, issuer)` |
| `setIssuer(addr, bool)` | owner | Rotate the backend's hot wallet |
| `transferOwnership(addr)` | owner | Hand ownership of the registry to a new owner |

`status` is an enum: `0 = None` (unknown), `1 = Valid`, `2 = Revoked`. `verify` returns `(None, false)` for an unknown id, `(Revoked, …)` after revoke, and `(Valid, false)` when `contentHash` no longer matches — i.e. the credential was tampered with.

### Local RPC quick reference

After `npm run node` + `npm run deploy:local`, the node JSON-RPC is at `http://127.0.0.1:8545` (chainId `31337`, `0x7a69`).

```bash
# Chain id
curl -X POST http://127.0.0.1:8545 -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'

# Read a credential via cast/ethers (status 1 = Valid)
npx hardhat run scripts/verify.ts --network localhost   # or use ethers in a script
```

Fresh local deploys always land at `0x5FbDB2315678afecb367f032d93F642f64180aa3` (first contract from account #0).

## Canonical payload & hashes

The same function must be used by the backend and any verifier:

```
payload     = `${id}|${learnerId}|${moduleId}|${competency}|${issuedAt}`   // issuedAt ISO-8601 UTC
contentHash = keccak256(utf8(payload))          // 0x… 32 bytes, stored in credentials.hash
idHash      = keccak256(utf8(id))               // "IMR-XXXX-XXXX"
```

The prototype computes these in `utils/credential.ts`; swap its simulated hash for `ethers.keccak256(ethers.toUtf8Bytes(payload))` when wiring the backend.

## Deploy (Hardhat)

```bash
mkdir imari-chain && cd imari-chain
npm i -D hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init            # "Create a TypeScript project"
cp ../blockchain/contracts/ImariCredentialRegistry.sol contracts/
```

`.env`

```
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<key>
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

`hardhat.config.ts`

```ts
import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';
export default {
  solidity: { version: '0.8.24', settings: { optimizer: { enabled: true, runs: 200 } } },
  networks: { sepolia: { url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.DEPLOYER_PRIVATE_KEY!] } },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};
```

`scripts/deploy.ts`

```ts
import { ethers } from 'hardhat';
async function main() {
  const registry = await ethers.deployContract('ImariCredentialRegistry');
  await registry.waitForDeployment();
  console.log('ImariCredentialRegistry:', await registry.getAddress());
}
main().catch((e) => { console.error(e); process.exit(1); });
```

```bash
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat verify --network sepolia <address>
```

Save the address as `CREDENTIAL_CONTRACT_ADDRESS` in the backend and in `platform_settings` (`credential.chain`).

## Tests to cover (Chapter 3.5)

- Issuer can issue; non-issuer reverts `NotIssuer`
- Duplicate `issue` reverts `AlreadyIssued`
- `verify` → `(Valid, true)` for the correct hash, `(Valid, false)` for an altered payload
- `revoke` → `(Revoked, …)`; revoking twice reverts `InvalidStatus`
- Unknown id → `(None, false)`

## Backend integration

```ts
import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer   = new Wallet(process.env.ISSUER_PRIVATE_KEY!, provider);
const registry = new Contract(process.env.CREDENTIAL_CONTRACT_ADDRESS!, ABI, signer);

const tx = await registry.issue(keccak256(toUtf8Bytes(id)), contentHash);
const receipt = await tx.wait();            // store receipt.hash + receipt.blockNumber on credentials row
```

Flow: `credentials` row inserted with `status='pending'` (DB trigger checks eligibility) → transaction sent → on receipt, update `tx_hash`, `block_number`, `status='valid'`. On RPC failure keep `pending` and retry from a job; the UI shows "Confirming…".

## Privacy rules

Never pass names, emails, scores or answers to the contract. The Sepolia testnet is used for the pilot — there is no mainnet deployment and no tokens, NFTs or trading.
