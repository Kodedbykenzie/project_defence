import { expect } from 'chai';
import { ethers } from 'hardhat';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import type { ImariCredentialRegistry } from '../typechain-types';

const ID = 'IMR-ABCD-2345';
const idHash = ethers.keccak256(ethers.toUtf8Bytes(ID));
const payload = 'IMR-ABCD-2345|learner-1|module-1|Budgeting basics|2026-10-01T00:00:00.000Z';
const contentHash = ethers.keccak256(ethers.toUtf8Bytes(payload));

describe('ImariCredentialRegistry', function () {
  let registry: ImariCredentialRegistry;
  let owner: HardhatEthersSigner;
  let issuer: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, issuer, stranger] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('ImariCredentialRegistry');
    registry = await factory.deploy();
    await registry.waitForDeployment();
    await registry.setIssuer(issuer.address, true);
  });

  it('owner can issue; stranger reverts NotIssuer', async function () {
    await expect(registry.connect(stranger).issue(idHash, contentHash)).to.be.revertedWithCustomError(registry, 'NotIssuer');
    await expect(registry.connect(issuer).issue(idHash, contentHash))
      .to.emit(registry, 'CredentialIssued')
      .withArgs(idHash, contentHash, anyValue => typeof anyValue === 'bigint');
    const rec = await registry.get(idHash);
    expect(rec.status).to.equal(1n);
    expect(rec.contentHash).to.equal(contentHash);
  });

  it('duplicate issue reverts AlreadyIssued', async function () {
    await registry.connect(issuer).issue(idHash, contentHash);
    await expect(registry.connect(issuer).issue(idHash, contentHash)).to.be.revertedWithCustomError(registry, 'AlreadyIssued');
  });

  it('verify returns (Valid, true) for correct hash and (Valid, false) for altered payload', async function () {
    await registry.connect(issuer).issue(idHash, contentHash);
    expect(await registry.verify(idHash, contentHash)).to.deep.equal([1n, true]);
    const altered = ethers.keccak256(ethers.toUtf8Bytes(payload + '|tampered'));
    expect(await registry.verify(idHash, altered)).to.deep.equal([1n, false]);
  });

  it('revoke sets (Revoked, ...) and revoking twice reverts InvalidStatus', async function () {
    await registry.connect(issuer).issue(idHash, contentHash);
    await expect(registry.connect(issuer).revoke(idHash)).to.emit(registry, 'CredentialRevoked');
    const rec = await registry.get(idHash);
    expect(rec.status).to.equal(2n);
    expect(rec.revokedAt).to.be.greaterThan(0n);
    await expect(registry.connect(issuer).revoke(idHash)).to.be.revertedWithCustomError(registry, 'InvalidStatus');
    expect((await registry.verify(idHash, contentHash))[0]).to.equal(2n);
    // A revoked credential must never report a match, even for the correct hash
    expect((await registry.verify(idHash, contentHash))[1]).to.equal(false);
  });

  it('reinstate restores Valid after revoke', async function () {
    await registry.connect(issuer).issue(idHash, contentHash);
    await registry.connect(issuer).revoke(idHash);
    await expect(registry.connect(issuer).reinstate(idHash)).to.emit(registry, 'CredentialReinstated').withArgs(idHash);
    expect((await registry.verify(idHash, contentHash))[0]).to.equal(1n);
    expect((await registry.verify(idHash, contentHash))[1]).to.equal(true);
    await expect(registry.connect(issuer).reinstate(idHash)).to.be.revertedWithCustomError(registry, 'InvalidStatus');
  });

  it('unknown id returns (None, false)', async function () {
    const unknown = ethers.keccak256(ethers.toUtf8Bytes('IMR-XXXX-YYYY'));
    expect(await registry.verify(unknown, contentHash)).to.deep.equal([0n, false]);
    await expect(registry.connect(issuer).revoke(unknown)).to.be.revertedWithCustomError(registry, 'InvalidStatus');
  });

  it('pausing blocks issue/revoke/reinstate until unpaused', async function () {
    await registry.setPaused(true);
    await expect(registry.connect(issuer).issue(idHash, contentHash)).to.be.revertedWithCustomError(registry, 'ContractPaused');
    await expect(registry.connect(stranger).setPaused(false)).to.be.revertedWithCustomError(registry, 'NotOwner');
    await registry.setPaused(false);
    await registry.connect(issuer).issue(idHash, contentHash);
    await registry.setPaused(true);
    await expect(registry.connect(issuer).revoke(idHash)).to.be.revertedWithCustomError(registry, 'ContractPaused');
    expect(await registry.verify(idHash, contentHash)).to.deep.equal([1n, true]);
  });

  it('only owner can setIssuer and transferOwnership', async function () {
    await expect(registry.connect(stranger).setIssuer(stranger.address, true)).to.be.revertedWithCustomError(registry, 'NotOwner');
    await registry.transferOwnership(issuer.address);
    expect(await registry.owner()).to.equal(issuer.address);
  });
});
