import 'dotenv/config';
import '@nomicfoundation/hardhat-toolbox';
import type { HardhatUserConfig } from 'hardhat/config';

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL ?? '';
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? '';

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    localhost: { url: 'http://127.0.0.1:8545' },
    ...(SEPOLIA_RPC_URL && DEPLOYER_PRIVATE_KEY
      ? {
          sepolia: {
            url: SEPOLIA_RPC_URL,
            accounts: [DEPLOYER_PRIVATE_KEY],
          },
        }
      : {}),
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY ?? '' },
};

export default config;
