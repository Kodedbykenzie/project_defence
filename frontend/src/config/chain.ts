import artifact from '../contracts/ImariCredentialRegistry.json';

export const RPC_URL = import.meta.env.VITE_RPC_URL as string | undefined;
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined;
export const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const CHAIN_CONFIGURED = Boolean(RPC_URL && CONTRACT_ADDRESS);
export const API_CONFIGURED = Boolean(API_URL);

export const contractAbi = artifact.abi;
