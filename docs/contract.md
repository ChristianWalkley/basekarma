# BaseKarma Contract

BaseKarma is a simple social karma counter for Base Mainnet.

## Public Action

`sendKarma(address receiver, address referrer)`

- Rejects zero address recipients.
- Rejects self-sends.
- Allows one send per sender and receiver per UTC contract day.
- Charges no ETH fee beyond gas.
- Applies referral rewards only when the sender has no recorded referrer.

## Owner Controls

- `pause()`
- `unpause()`
- `setRewards(uint256,uint256,uint256)`
- `transferOwnership(address)`
