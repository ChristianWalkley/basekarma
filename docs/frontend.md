# Frontend Notes

The app uses native Wagmi connectors and intentionally limits visible wallet choices to:

- OKX Wallet
- MetaMask
- Coinbase Wallet

RainbowKit, WalletConnect, and `getDefaultConfig` are not used.

The invite UI copies a referral URL to the clipboard without rendering a full URL on the page.
