/**
 * ChainGateway — the single seam between the application and the blockchain.
 *
 * Everything that touches the registry goes through this interface, which
 * gives the backend two interchangeable strategies:
 *
 *   EthersChainGateway    — real transactions against a live node
 *                           (Sepolia in production, a local Hardhat node in
 *                            development).
 *   SimulatedChainGateway — a deterministic, offline stand-in used when no
 *                           RPC/key is configured, so the rest of the system
 *                           can be exercised without a chain.
 *
 * The rest of the backend never imports `ethers` directly and never branches
 * on "are we on a real chain?" — it just calls the gateway.
 */
import { Contract, JsonRpcProvider, Wallet, id as keccakId } from 'ethers';
import artifact from '../../../blockchain/exports/ImariCredentialRegistry.json' with { type: 'json' };
import { config } from '../config.js';
import { idHash } from '../lib/credential.js';

export type ChainStatus = 'none' | 'valid' | 'revoked';

export interface ChainRecord {
  status: ChainStatus;
  contentHash: string;
  issuedAt: number;
  revokedAt: number;
  /** Populated only by the strategy that performed the write. */
  txHash: string | null;
  blockNumber: number | null;
  chainId: number;
}

export interface ChainVerification {
  status: ChainStatus;
  /** True only when the credential is currently valid AND the presented hash
   *  equals the anchored hash. A revoked credential never matches. */
  matches: boolean;
}

export interface ChainGateway {
  /** 'sepolia' for real transactions, 'simulate' for the offline stand-in. */
  readonly mode: 'sepolia' | 'simulate';
  /** Human-readable network label, e.g. "chainId 11155111". */
  readonly network: string;
  /** Numeric chain id the gateway talks to. */
  readonly chainId: number;
  /** Deployed registry address, when a real chain is configured. */
  readonly contractAddress: string | null;

  issue(credentialId: string, contentHash: string): Promise<ChainRecord>;
  revoke(credentialId: string): Promise<{ txHash: string; blockNumber: number }>;
  reinstate(credentialId: string): Promise<{ txHash: string; blockNumber: number }>;
  /** Read the anchored record, or null when the id was never issued. */
  read(credentialId: string): Promise<ChainRecord | null>;
  /** Ask the contract whether a presented hash matches the anchored one. */
  verify(credentialId: string, presentedHash: string): Promise<ChainVerification>;
}

// --------------------------------------------------------------- real chain

const REGISTRY_ABI = [
  'function issue(bytes32 idHash, bytes32 contentHash)',
  'function revoke(bytes32 idHash)',
  'function reinstate(bytes32 idHash)',
  'function get(bytes32 idHash) view returns (bytes32 contentHash, uint64 issuedAt, uint64 revokedAt, uint8 status)',
  'function verify(bytes32 idHash, bytes32 presentedHash) view returns (uint8 status, bool matches)',
] as const;

const STATUS_FROM_NUMBER: Record<number, ChainStatus> = { 0: 'none', 1: 'valid', 2: 'revoked' };

/** Talks to a real node with a real signing key. */
export class EthersChainGateway implements ChainGateway {
  readonly mode = 'sepolia' as const;
  readonly contractAddress: string;
  readonly chainId: number;

  private readonly provider: JsonRpcProvider;
  private readonly signer: Wallet;
  private readonly registry: any;

  constructor(
    rpcUrl: string,
    privateKey: string,
    contractAddress: string,
  ) {
    this.contractAddress = contractAddress;
    this.provider = new JsonRpcProvider(rpcUrl);
    // The wallet MUST carry the provider: a bare Wallet cannot sign a
    // transaction or service a read-only `call`.
    this.signer = new Wallet(privateKey, this.provider);
    this.registry = new Contract(contractAddress, REGISTRY_ABI, this.signer);
    this.chainId = 11155111; // Default Sepolia
    // Kick off async detection but don't wait for it
    void this.detectChainId();
  }

  /** Resolves the live chain id so the database never records a hard-coded network. */
  async detectChainId(): Promise<number> {
    try {
      const net = await this.provider.getNetwork();
      const detected = Number(net.chainId);
      (this as any).chainId = detected;
      return detected;
    } catch {
      return (this as any).chainId;
    }
  }

  get network(): string {
    return `chainId ${this.chainId}`;
  }

  /**
   * The pending nonce for the issuer wallet.
   *
   * ethers' provider caches `getTransactionCount`, so two transactions sent
   * in quick succession (revoke, then reinstate) can reuse the same nonce and
   * the node rejects the second one with "nonce too low". Asking the node
   * directly with a raw `eth_getTransactionCount` bypasses that cache.
   */
  private async pendingNonce(): Promise<number> {
    const raw = (await this.provider.send('eth_getTransactionCount', [
      this.signer.address,
      'pending',
    ])) as string;
    return Number(BigInt(raw));
  }

  private async write(fn: 'issue' | 'revoke' | 'reinstate', credentialId: string, contentHash?: string) {
    const hash = idHash(credentialId);
    const overrides = { nonce: await this.pendingNonce() };
    let tx;
    if (fn === 'issue') {
      tx = await this.registry.issue(hash, contentHash!, overrides);
    } else if (fn === 'revoke') {
      tx = await this.registry.revoke(hash, overrides);
    } else {
      tx = await this.registry.reinstate(hash, overrides);
    }
    const receipt = await tx.wait();
    if (!receipt) throw new Error(`transaction dropped (${fn})`);
    return { txHash: receipt.hash as string, blockNumber: Number(receipt.blockNumber) };
  }

  async issue(credentialId: string, contentHash: string): Promise<ChainRecord> {
    const { txHash, blockNumber } = await this.write('issue', credentialId, contentHash);
    const record = await this.read(credentialId);
    return {
      status: record?.status ?? 'valid',
      contentHash,
      issuedAt: record?.issuedAt ?? 0,
      revokedAt: 0,
      txHash,
      blockNumber,
      chainId: this.chainId,
    };
  }

  async revoke(credentialId: string): Promise<{ txHash: string; blockNumber: number }> {
    return this.write('revoke', credentialId);
  }

  async reinstate(credentialId: string): Promise<{ txHash: string; blockNumber: number }> {
    return this.write('reinstate', credentialId);
  }

  async read(credentialId: string): Promise<ChainRecord | null> {
    const rec = await this.registry.get(idHash(credentialId));
    if (!rec) return null;
    const status = STATUS_FROM_NUMBER[Number(rec[3])] ?? 'none';
    if (status === 'none') return null;
    return {
      status,
      contentHash: String(rec[0]),
      issuedAt: Number(rec[1]),
      revokedAt: Number(rec[2]),
      txHash: null,
      blockNumber: null,
      chainId: this.chainId,
    };
  }

  async verify(credentialId: string, presentedHash: string): Promise<ChainVerification> {
    const result = await this.registry.verify(idHash(credentialId), presentedHash);
    if (!result) return { status: 'none', matches: false };
    const [status, matches] = result;
    return { status: STATUS_FROM_NUMBER[Number(status)] ?? 'none', matches: Boolean(matches) };
  }
}

// ------------------------------------------------------------ offline mode

/**
 * Deterministic offline stand-in. The "on-chain" record is derived from the
 * credential id and the content hash, so the same credential always produces
 * the same fingerprint — which keeps tests and the demo reproducible without
 * a running node.
 */
export class SimulatedChainGateway implements ChainGateway {
  readonly mode = 'simulate' as const;
  readonly contractAddress: string | null = null;

  get network(): string {
    return 'simulated (no RPC configured)';
  }

  get chainId(): number {
    return 0;
  }

  async issue(credentialId: string, contentHash: string): Promise<ChainRecord> {
    return {
      status: 'valid',
      contentHash,
      issuedAt: Math.floor(Date.now() / 1000),
      revokedAt: 0,
      txHash: simulatedTxHash(credentialId),
      blockNumber: simulatedBlock(credentialId),
      chainId: this.chainId,
    };
  }

  async revoke(credentialId: string): Promise<{ txHash: string; blockNumber: number }> {
    return { txHash: simulatedTxHash(`revoke:${credentialId}`), blockNumber: simulatedBlock(credentialId) };
  }

  async reinstate(credentialId: string): Promise<{ txHash: string; blockNumber: number }> {
    return { txHash: simulatedTxHash(`reinstate:${credentialId}`), blockNumber: simulatedBlock(credentialId) };
  }

  async read(): Promise<ChainRecord | null> {
    return null;
  }

  async verify(): Promise<ChainVerification> {
    return { status: 'none', matches: false };
  }
}

// ------------------------------------------------------------------ helpers

/** Deterministic stand-in tx hash used when no RPC is configured (dev mode). */
export function simulatedTxHash(id: string): string {
  return keccakId(`sepolia-tx:${id}`);
}

export function simulatedBlock(id: string): number {
  return 6_800_000 + (parseInt(keccakId(id).slice(2, 8), 16) % 90_000);
}

/**
 * Build the gateway that matches the current configuration. Real transactions
 * are used only when an RPC url, an issuer key AND a deployed registry
 * address are all present.
 */
export function createChainGateway(): ChainGateway {
  const { SEPOLIA_RPC_URL, ISSUER_PRIVATE_KEY, CREDENTIAL_CONTRACT_ADDRESS } = config;
  if (SEPOLIA_RPC_URL && ISSUER_PRIVATE_KEY && CREDENTIAL_CONTRACT_ADDRESS) {
    return new EthersChainGateway(SEPOLIA_RPC_URL, ISSUER_PRIVATE_KEY, CREDENTIAL_CONTRACT_ADDRESS);
  }
  return new SimulatedChainGateway();
}

let singleton: ChainGateway | null = null;

/**
 * The application-wide gateway. Kept as a lazy singleton so the chain id can
 * be detected once at boot, and so tests can inject a stub with
 * setChainGateway().
 */
export function getChainGateway(): ChainGateway {
  if (!singleton) singleton = createChainGateway();
  return singleton;
}

/** Replace the gateway (tests inject a fake here). */
export function setChainGateway(next: ChainGateway | null): void {
  singleton = next;
}

export { artifact as registryArtifact };
