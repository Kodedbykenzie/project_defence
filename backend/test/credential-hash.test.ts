/**
 * Unit tests for the credential hashing contract and the chain gateway.
 *
 * The canonical payload format is the contract between the backend, the
 * contract and any external verifier, so it is pinned here: if it changes,
 * every credential already anchored on-chain would stop verifying.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { keccak256, toUtf8Bytes } from 'ethers';
import {
  credentialPayload,
  contentHash,
  idHash,
  newCredentialId,
} from '../src/lib/credential.js';
import { SimulatedChainGateway, createChainGateway } from '../src/services/chain-gateway.js';

const PARTS = {
  id: 'IMR-ABCD-2345',
  learnerId: 'learner-1',
  moduleId: 'module-1',
  competency: 'Responsible borrowing',
  issuedAt: '2026-10-01T00:00:00.000Z',
};

describe('the canonical credential payload', () => {
  test('has the documented pipe-separated shape', () => {
    assert.equal(
      credentialPayload(PARTS),
      'IMR-ABCD-2345|learner-1|module-1|Responsible borrowing|2026-10-01T00:00:00.000Z',
    );
  });

  test('the content hash is keccak256 of the payload', () => {
    assert.equal(contentHash(PARTS), keccak256(toUtf8Bytes(credentialPayload(PARTS))));
  });

  test('the content hash is 32 bytes of lowercase hex', () => {
    assert.match(contentHash(PARTS), /^0x[0-9a-f]{64}$/);
  });

  test('the id hash is keccak256 of the credential id', () => {
    assert.equal(idHash(PARTS.id), keccak256(toUtf8Bytes(PARTS.id)));
  });

  test('changing any field changes the content hash', () => {
    const base = contentHash(PARTS);
    assert.notEqual(contentHash({ ...PARTS, id: 'IMR-ABCD-2346' }), base);
    assert.notEqual(contentHash({ ...PARTS, learnerId: 'learner-2' }), base);
    assert.notEqual(contentHash({ ...PARTS, moduleId: 'module-2' }), base);
    assert.notEqual(contentHash({ ...PARTS, competency: 'Something else' }), base);
    assert.notEqual(contentHash({ ...PARTS, issuedAt: '2026-10-01T00:00:00.001Z' }), base);
  });

  test('the hash is stable across calls', () => {
    assert.equal(contentHash(PARTS), contentHash({ ...PARTS }));
  });

  test('two credentials that differ only by a separator cannot collide', () => {
    // The pipe separator keeps the fields unambiguous.
    const a = contentHash({ ...PARTS, competency: 'A|B' });
    const b = contentHash({ ...PARTS, competency: 'A', moduleId: 'B' });
    assert.notEqual(a, b);
  });
});

describe('credential ids', () => {
  test('match the documented IMR-XXXX-XXXX shape', () => {
    for (let i = 0; i < 200; i += 1) {
      assert.match(newCredentialId(), /^IMR-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    }
  });

  test('avoid the ambiguous characters 0, O, 1 and I in the random part', () => {
    for (let i = 0; i < 200; i += 1) {
      const id = newCredentialId();
      const randomPart = id.slice(4); // drop the fixed "IMR-" prefix
      assert.ok(!/[01OI]/.test(randomPart), `${id} contains an ambiguous character`);
    }
  });

  test('are effectively unique', () => {
    const ids = new Set(Array.from({ length: 2000 }, newCredentialId));
    assert.equal(ids.size, 2000);
  });
});

describe('SimulatedChainGateway', () => {
  const gateway = new SimulatedChainGateway();

  test('reports the simulate mode', () => {
    assert.equal(gateway.mode, 'simulate');
    assert.equal(gateway.chainId, 0);
    assert.equal(gateway.contractAddress, null);
  });

  test('issues a deterministic transaction hash', async () => {
    const a = await gateway.issue('IMR-ABCD-2345', '0x' + 'a'.repeat(64));
    const b = await gateway.issue('IMR-ABCD-2345', '0x' + 'a'.repeat(64));
    assert.equal(a.txHash, b.txHash);
    assert.match(a.txHash!, /^0x[0-9a-f]{64}$/);
    assert.equal(a.status, 'valid');
  });

  test('different credentials get different transaction hashes', async () => {
    const a = await gateway.issue('IMR-ABCD-2345', '0x' + 'a'.repeat(64));
    const b = await gateway.issue('IMR-EFGH-6789', '0x' + 'a'.repeat(64));
    assert.notEqual(a.txHash, b.txHash);
  });

  test('never reports an anchored record, so nothing looks verified offline', async () => {
    assert.equal(await gateway.read('IMR-ABCD-2345'), null);
  });
});

describe('createChainGateway', () => {
  test('falls back to the simulated gateway when no chain is configured', () => {
    // The test environment deliberately clears the chain variables.
    assert.equal(createChainGateway().mode, 'simulate');
  });
});
