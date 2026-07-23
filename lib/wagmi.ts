import { Attribution } from "ox/erc8021";
import { baseAccount, coinbaseWallet, injected } from "@wagmi/connectors";
import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import type { EIP1193Provider } from "viem";

type FlaggedProvider = EIP1193Provider & {
  isMetaMask?: true;
  isOkxWallet?: true;
  isOKExWallet?: true;
  isOkxWalletExtension?: true;
  providers?: FlaggedProvider[];
};

type WalletWindow = Window & {
  ethereum?: FlaggedProvider;
  okxwallet?: FlaggedProvider;
  okxWallet?: FlaggedProvider;
};

export const builderCode = process.env.NEXT_PUBLIC_BUILDER_CODE || "bc_wd6wedj6";
export const dataSuffix = Attribution.toDataSuffix({ codes: [builderCode] }) as `0x${string}`;

function getInjectedProvider(match: (provider: FlaggedProvider) => boolean) {
  return (window?: unknown) => {
    const walletWindow = window as WalletWindow | undefined;
    const ethereum = walletWindow?.ethereum;
    const directProviders = [walletWindow?.okxwallet, walletWindow?.okxWallet].filter(Boolean) as FlaggedProvider[];
    const ethereumProviders = ethereum?.providers?.length ? ethereum.providers : ethereum ? [ethereum] : [];
    const providers = [...directProviders, ...ethereumProviders];
    return providers.find(match);
  };
}

export const okxConnector = injected({
  shimDisconnect: true,
  target: {
    id: "okx",
    name: "OKX Wallet",
    provider: getInjectedProvider((provider) =>
      Boolean(provider.isOkxWallet || provider.isOKExWallet || provider.isOkxWalletExtension)
    )
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
  preference: {
    options: "all"
  }
});

export const baseAccountConnector = baseAccount({
  appName: "BaseKarma",
  preference: {
    options: "all"
  }
});

export const config = createConfig({
  chains: [base],
  connectors: [okxConnector, metaMaskConnector, coinbaseConnector, baseAccountConnector],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage
  }),
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
