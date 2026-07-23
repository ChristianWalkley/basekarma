# BaseKarma

BaseKarma is a Base Mini App for sending free social karma between wallets. Users only pay gas.

## Stack

- Next.js App Router
- TypeScript
- Wagmi native config
- Viem
- Tailwind CSS
- Solidity `^0.8.20`

## Environment

Copy `.env.example` to `.env.local` and update the values after deployment and Base attribution setup.

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_BUILDER_CODE=BASEKARMA_BUILDER_CODE
NEXT_PUBLIC_BASE_APP_ID=BASEKARMA_BASE_APP_VERIFY_TOKEN
NEXT_PUBLIC_DATA_SUFFIX=0x8021802180218021
```

The offchain attribution meta tag is hardcoded in `app/layout.tsx`. The onchain ERC-8021 suffix is configured once in `lib/wagmi.ts`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Contract

The Solidity source is in `contracts/BaseKarma.sol`.

The generated ABI is in `lib/baseKarmaAbi.ts` and the full compiler artifact is in `artifacts/BaseKarma.json`.

Suggested compiler settings:

- Solidity `^0.8.20`
- EVM version `paris`
- Chain: Base Mainnet, chain ID `8453`

After deploying the contract, set `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel and redeploy.

## Checks

- Page source contains `base:app_id`.
- The UI only shows OKX Wallet, MetaMask, and Coinbase Wallet as wallet choices.
- The invite area copies a URL but does not display a full URL.
- `sendKarma(address receiver, address referrer)` receives the URL referrer address on the first send, or `address(0)` when no valid `?ref=` is present.
- Transactions created through the shared Wagmi config append `NEXT_PUBLIC_DATA_SUFFIX`.
