import { encodeFunctionData, concatHex, type Address, type Hex } from "viem";
import { baseKarmaAbi, CONTRACT_ADDRESS } from "./contract";
import { dataSuffix } from "./wagmi";

export const ENTRY_POINT_V06 = "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789" as const;

export function encodeSendKarmaCall(receiver: Address, referrer: Address) {
  return encodeFunctionData({
    abi: baseKarmaAbi,
    functionName: "sendKarma",
    args: [receiver, referrer]
  });
}

export function appendAttributionSuffix(data: Hex) {
  return data.endsWith(dataSuffix) ? data : concatHex([data, dataSuffix]);
}

export function buildAttributedSendKarmaCall(receiver: Address, referrer: Address) {
  const data = encodeSendKarmaCall(receiver, referrer);
  return {
    to: CONTRACT_ADDRESS,
    data,
    dataSuffix
  };
}

export { dataSuffix };
