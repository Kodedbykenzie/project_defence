import { chromium } from 'playwright';
const html = `<html><body style="background:white;margin:20px"><div class="mermaid">flowchart LR
    B[Browser<br/>React SPA · Vite · Tailwind] -->|HTTPS /v1 JSON| API[Backend<br/>Fastify · JWT · scoring]
    B -->|eth_* JSON-RPC read| CHAIN[(Ethereum<br/>Hardhat :8545 / Sepolia)]
    API -->|SQL| DB[(PostgreSQL<br/>Supabase · triggers · RLS)]
    API -->|ethers tx| CHAIN
    CHAIN --- C[ImariCredentialRegistry<br/>issue · revoke · verify]</div>
<script type="module">import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';mermaid.initialize({startOnLoad:true});</script></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 500 } });
await page.setContent(html);
await page.waitForTimeout(3000);
await page.screenshot({ path: '../docs/architecture-mermaid.png', fullPage: true });
await browser.close();
console.log('saved');
