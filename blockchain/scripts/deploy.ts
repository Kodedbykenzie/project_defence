import { ethers } from 'hardhat';

async function main() {
  const registry = await ethers.deployContract('ImariCredentialRegistry');
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log('ImariCredentialRegistry:', address);
  console.log('Network:', (await ethers.provider.getNetwork()).name, (await ethers.provider.getNetwork()).chainId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
