import { zeroAddress, type Address } from "viem";
import { baseKarmaAbi } from "./baseKarmaAbi";

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || zeroAddress) as Address;
export const BASE_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 8453);

export { baseKarmaAbi };
