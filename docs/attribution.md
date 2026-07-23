# Base Attribution

Offchain attribution is hardcoded in `app/layout.tsx`:

`base:app_id`

Onchain attribution is configured once in `lib/wagmi.ts`:

`dataSuffix`

All contract writes should use the shared Wagmi config so the transaction calldata includes the suffix.
