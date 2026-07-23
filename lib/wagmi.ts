import { coinbaseWallet, injected } from "@wagmi/connectors";
import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import type { EIP1193Provider } from "viem";

type FlaggedProvider = EIP1193Provider & {
  isMetaMask?: true;
  isOkxWallet?: true;
  isOKExWallet?: true;
  providers?: FlaggedProvider[];
};

type WalletWindow = Window & {
  ethereum?: FlaggedProvider;
};

const dataSuffix = (process.env.NEXT_PUBLIC_DATA_SUFFIX ||
  "0x62635f7764367765646a360b0080218021802180218021802180218021") as `0x${string}`;

function getInjectedProvider(match: (provider: FlaggedProvider) => boolean) {
  return (window?: unknown) => {
    const walletWindow = window as WalletWindow | undefined;
    const ethereum = walletWindow?.ethereum;
    if (!ethereum) return undefined;
    const providers = ethereum.providers?.length ? ethereum.providers : [ethereum];
    return providers.find(match);
  };
}

export const okxConnector = injected({
  shimDisconnect: true,
  target: {
    id: "okx",
    name: "OKX Wallet",
    provider: getInjectedProvider((provider) => Boolean(provider.isOkxWallet || provider.isOKExWallet))
  }
});

export const metaMaskConnector = injected({
  shimDisconnect: true,
  target: {
    id: "metaMask",
    name: "MetaMask",
    provider: getInjectedProvider((provider) => Boolean(provider.isMetaMask && !provider.isOkxWallet))
  }
});

export const coinbaseConnector = coinbaseWallet({
  appName: "BaseKarma",
  preference: "eoaOnly"
});

export const config = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  dataSuffix,
  transports: {
    [base.id]: http()
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
