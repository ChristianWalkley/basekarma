import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { Attribution } from "ox/erc8021";

const txHash = process.argv[2];
const contractAddress = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x082D9CB7ad2A72bb4F36FBA48f054D2b3A08986C").toLowerCase();
const builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE || "bc_wd6wedj6";
const dataSuffix = Attribution.toDataSuffix({ codes: [builderCode] }).toLowerCase();
const entryPoint = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789";

if (!txHash) {
  console.error("Usage: node scripts/check-base-tx.mjs <base-tx-hash>");
  process.exit(1);
}

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL)
});

const tx = await client.getTransaction({ hash: txHash });
const input = tx.input.toLowerCase();

console.log({
  hash: tx.hash,
  from: tx.from,
  to: tx.to,
  toContract: tx.to?.toLowerCase() === contractAddress,
  toEntryPoint: tx.to?.toLowerCase() === entryPoint,
  builderCode,
  dataSuffix,
  inputContainsDataSuffix: input.includes(dataSuffix.slice(2)),
  inputEndsWithDataSuffix: input.endsWith(dataSuffix.slice(2))
});
