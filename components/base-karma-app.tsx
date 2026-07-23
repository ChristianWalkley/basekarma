"use client";

import {
  Activity,
  Copy,
  Gift,
  Heart,
  Loader2,
  LogOut,
  Send,
  Sparkles,
  Trophy,
  UserRound
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSendCalls,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { base } from "wagmi/chains";
import { formatUnits, isAddress, zeroAddress, type Address, type Hex } from "viem";
import { appendAttributionSuffix, buildAttributedSendKarmaCall, dataSuffix } from "@/lib/attribution";
import { BASE_CHAIN_ID, CONTRACT_ADDRESS, baseKarmaAbi } from "@/lib/contract";

type ActivityItem = {
  hash: string;
  sender: Address;
  receiver: Address;
  amount: bigint;
  timestamp: bigint;
};

const walletLabels = ["OKX Wallet", "MetaMask", "Coinbase Wallet"];

function shortAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function statValue(value: unknown) {
  return typeof value === "bigint" ? formatUnits(value, 0) : "0";
}

function errorText(error: Error) {
  return "shortMessage" in error && typeof error.shortMessage === "string" ? error.shortMessage : error.message;
}

export function BaseKarmaApp() {
  const [recipient, setRecipient] = useState("");
  const [notice, setNotice] = useState<{ tone: "good" | "bad" | "soft"; text: string } | null>(null);
  const queryClient = useQueryClient();
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect, error: connectError, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: base.id });
  const {
    sendCallsAsync,
    data: callsData,
    error: callsError,
    isPending: isSendingCalls
  } = useSendCalls();
  const {
    sendTransactionAsync,
    data: txHash,
    error: sendTransactionError,
    isPending: isSendingTransaction
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash
  });

  const referrer = useMemo(() => {
    if (typeof window === "undefined") return zeroAddress;
    const candidate = new URLSearchParams(window.location.search).get("ref");
    return candidate && isAddress(candidate) ? (candidate as Address) : zeroAddress;
  }, []);

  const statsQuery = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseKarmaAbi,
    functionName: "getUserStats",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && Boolean(address) && CONTRACT_ADDRESS !== zeroAddress
    }
  });

  const stats = statsQuery.data;
  const receivedKarma = statValue(stats?.[0]);
  const sentKarma = statValue(stats?.[1]);
  const rewardPoints = statValue(stats?.[2]);

  const namedConnectors = walletLabels.map((label) => ({
    label,
    connector: connectors.find((connector) => connector.name === label)
  }));

  const visibleNotice = sendTransactionError
    ? { tone: "bad" as const, text: errorText(sendTransactionError) }
    : callsError
      ? { tone: "bad" as const, text: errorText(callsError) }
    : connectError
      ? { tone: "bad" as const, text: errorText(connectError) }
    : isConfirmed
      ? { tone: "good" as const, text: "Karma sent." }
      : callsData
        ? { tone: "good" as const, text: "Karma submitted." }
      : notice;

  const activityQuery = useMemo(() => ["karmaActivity", address], [address]);

  const { data: activities = [] } = useQuery({
    queryKey: activityQuery,
    enabled: isConnected && Boolean(address) && Boolean(publicClient) && CONTRACT_ADDRESS !== zeroAddress,
    queryFn: async () => {
      if (!publicClient || !address) return [] as ActivityItem[];
      const fromBlock = await publicClient.getBlockNumber().then((block) => (block > 25000n ? block - 25000n : 0n));
      const [sentLogs, receivedLogs] = await Promise.all([
        publicClient.getContractEvents({
          address: CONTRACT_ADDRESS,
          abi: baseKarmaAbi,
          eventName: "KarmaSent",
          args: { sender: address },
          fromBlock
        }),
        publicClient.getContractEvents({
          address: CONTRACT_ADDRESS,
          abi: baseKarmaAbi,
          eventName: "KarmaSent",
          args: { receiver: address },
          fromBlock
        })
      ]);

      return [...sentLogs, ...receivedLogs]
        .filter((log) => log.args.sender && log.args.receiver && log.args.amount && log.args.timestamp)
        .map((log) => ({
          hash: log.transactionHash,
          sender: log.args.sender as Address,
          receiver: log.args.receiver as Address,
          amount: log.args.amount as bigint,
          timestamp: log.args.timestamp as bigint
        }))
        .sort((a, b) => Number(b.timestamp - a.timestamp))
        .filter((item, index, list) => list.findIndex((candidate) => candidate.hash === item.hash) === index)
        .slice(0, 8);
    }
  });

  useEffect(() => {
    if (isConfirmed) {
      void statsQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: activityQuery });
    }
  }, [activityQuery, isConfirmed, queryClient, statsQuery]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: baseKarmaAbi,
    eventName: "KarmaSent",
    enabled: CONTRACT_ADDRESS !== zeroAddress,
    onLogs(logs) {
      const next = logs
        .filter((log) => log.args.sender && log.args.receiver && log.args.amount && log.args.timestamp)
        .map((log) => ({
          hash: log.transactionHash,
          sender: log.args.sender as Address,
          receiver: log.args.receiver as Address,
          amount: log.args.amount as bigint,
          timestamp: log.args.timestamp as bigint
        }));
      queryClient.setQueryData<ActivityItem[]>(activityQuery, (current = []) =>
        [...next, ...current]
          .filter((item) => item.sender === address || item.receiver === address)
          .filter((item, index, list) => list.findIndex((candidate) => candidate.hash === item.hash) === index)
          .slice(0, 8)
      );
    }
  });

  async function handleSend() {
    if (!isConnected) {
      setNotice({ tone: "soft", text: "Choose a wallet to connect." });
      return;
    }
    if (CONTRACT_ADDRESS === zeroAddress) {
      setNotice({ tone: "bad", text: "Contract address is not configured." });
      return;
    }
    if (!recipient) {
      setNotice({ tone: "soft", text: "Enter a recipient wallet address." });
      return;
    }
    if (!isAddress(recipient)) {
      setNotice({ tone: "bad", text: "Enter a valid recipient address." });
      return;
    }
    if (recipient.toLowerCase() === address?.toLowerCase()) {
      setNotice({ tone: "bad", text: "You cannot send karma to yourself." });
      return;
    }
    if (chainId !== BASE_CHAIN_ID) {
      await switchChainAsync({ chainId: base.id });
    }
    const call = buildAttributedSendKarmaCall(recipient as Address, referrer);
    try {
      await sendCallsAsync({
        calls: [call],
        capabilities: {
          dataSuffix: {
            value: dataSuffix
          }
        },
        chainId: base.id,
        experimental_fallback: true
      });
    } catch {
      await sendTransactionAsync({
        to: CONTRACT_ADDRESS,
        data: appendAttributionSuffix(call.data as Hex),
        chainId: base.id
      });
    }
  }

  async function copyInvite() {
    if (!address) {
      setNotice({ tone: "soft", text: "Connect a wallet first." });
      return;
    }
    const invite = `${window.location.origin}${window.location.pathname}?ref=${address}`;
    await navigator.clipboard.writeText(invite);
    setNotice({ tone: "good", text: "Invite link copied." });
  }

  const busy = isSendingCalls || isSendingTransaction || isConfirming || isSwitching;
  const hasRecipient = recipient.length > 0;
  const validRecipient = hasRecipient && isAddress(recipient);
  const isOwnRecipient = validRecipient && recipient.toLowerCase() === address?.toLowerCase();
  const sendButtonLabel = !isConnected
    ? "Connect Wallet"
    : !hasRecipient
      ? "Enter Recipient"
      : !validRecipient
        ? "Invalid Address"
        : isOwnRecipient
          ? "Use Another Wallet"
          : isConfirming
            ? "Confirming..."
            : "Send Karma";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#77f0b2]">
            <Sparkles size={16} />
            BaseKarma
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-normal text-white sm:text-6xl">BaseKarma</h1>
          <p className="mt-2 text-base text-[#a9b4c7]">Send good vibes on Base.</p>
        </div>
        {isConnected ? (
          <button
            className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
            onClick={() => disconnect()}
          >
            <LogOut size={16} />
            Disconnect
          </button>
        ) : null}
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-lg border border-white/10 bg-[#111722]/90 p-4 shadow-2xl shadow-black/30 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6f7d94]">Wallet</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {isConnected ? shortAddress(address) : "Not connected"}
              </p>
            </div>
            <span className="rounded-full border border-[#77f0b2]/30 bg-[#77f0b2]/10 px-3 py-1 text-xs font-bold text-[#9df4c3]">
              Base Mainnet
            </span>
          </div>

          {!isConnected ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {namedConnectors.map(({ label, connector }) => (
                <button
                  key={label}
                  className="h-12 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white transition hover:border-[#77f0b2]/40 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!connector || isConnecting}
                  onClick={() => connector && connect({ connector, chainId: base.id })}
                >
                  {isConnecting ? "Connecting..." : label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <Stat icon={<Heart size={18} />} label="Received Karma" value={receivedKarma} />
            <Stat icon={<Send size={18} />} label="Sent Karma" value={sentKarma} />
            <Stat icon={<Trophy size={18} />} label="Reward Points" value={rewardPoints} />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#121923] p-4 shadow-2xl shadow-black/30 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Gift size={18} className="text-[#77f0b2]" />
            Send Karma
          </div>
          <label className="mt-5 block text-sm font-semibold text-[#b8c2d6]" htmlFor="recipient">
            Recipient wallet address
          </label>
          <input
            id="recipient"
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#090d14] px-4 text-sm text-white outline-none transition placeholder:text-[#5f6b7f] focus:border-[#77f0b2]/70 focus:ring-4 focus:ring-[#77f0b2]/10"
            placeholder="0x..."
            value={recipient}
            onChange={(event) => setRecipient(event.target.value.trim())}
          />
          <button
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#77f0b2] px-4 text-sm font-black text-[#06100a] transition hover:bg-[#92f7c5] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={handleSend}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
            {sendButtonLabel}
          </button>
          {visibleNotice ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                visibleNotice.tone === "good"
                  ? "border-[#77f0b2]/25 bg-[#77f0b2]/10 text-[#b9ffd6]"
                  : visibleNotice.tone === "bad"
                    ? "border-[#ff7a90]/25 bg-[#ff7a90]/10 text-[#ffc5ce]"
                    : "border-white/10 bg-white/[0.05] text-[#c8d2e6]"
              }`}
            >
              {visibleNotice.text}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-lg border border-white/10 bg-[#111722]/85 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <UserRound size={18} className="text-[#8ab4ff]" />
              Invite
            </div>
            <button
              className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-sm font-bold text-white transition hover:bg-white/[0.1]"
              onClick={copyInvite}
            >
              <Copy size={16} />
              Copy Invite Link
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111722]/85 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Activity size={18} className="text-[#77f0b2]" />
            Recent Karma Activity
          </div>
          <div className="mt-4 space-y-2">
            {activities.length ? (
              activities.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0b1018] px-3 py-3"
                  key={item.hash}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.sender === address ? "Sent to" : "Received from"}{" "}
                      {shortAddress(item.sender === address ? item.receiver : item.sender)}
                    </p>
                    <p className="mt-1 text-xs text-[#748197]">{new Date(Number(item.timestamp) * 1000).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#77f0b2]/10 px-3 py-1 text-xs font-black text-[#9df4c3]">
                    +{formatUnits(item.amount, 0)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 bg-[#0b1018] px-3 py-6 text-center text-sm text-[#748197]">
                No activity yet.
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#090d14]/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          {[
            ["Send", Heart],
            ["Stats", Trophy],
            ["Invite", Copy]
          ].map(([label, Icon]) => (
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-bold text-[#c9d4e8] transition hover:bg-white/[0.06]"
              key={label as string}
            >
              <Icon size={16} />
              {label as string}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}


function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-[#0b1018] p-3">
      <div className="text-[#77f0b2]">{icon}</div>
      <p className="mt-3 text-2xl font-black text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-snug text-[#7e8ba1]">{label}</p>
    </div>
  );
}
