# Quick Start Guide - Polymarket Copy Trading Bot

Get up and running in 5 minutes!

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in these **required** fields:

```env
USER_ADDRESS=0x...          # Trader to copy
PROXY_WALLET=0x...          # Your wallet
PRIVATE_KEY=...             # Your private key
RPC_URL=https://...         # Your RPC endpoint
```

## 3. Build

```bash
npm run build
```

## 4. Run

```bash
npm run start
```

## 5. Monitor

Watch the console output for status messages. The bot will:
- Connect to Polymarket API
- Monitor the source trader
- Execute copy trades automatically
- Update positions every 30 seconds

## Configuration Quick Reference

| Setting | Default | Purpose |
| --- | --- | --- |
| `FETCH_INTERVAL` | 1 | Check for new trades every N seconds |
| `RISK_PERCENTAGE` | 2 | Execute 2% of source trader's position size |
| `MAX_POSITION_SIZE` | 1000 | Maximum USDC per position |
| `SLIPPAGE_TOLERANCE` | 0.5 | Accept up to 0.5% price slippage |

## Stopping the Bot

Press `Ctrl+C` to gracefully shut down the bot. It will:
- Cancel all pending orders
- Close WebSocket connection
- Save final state

## Next Steps

- Read [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed configuration
- Check [README.md](./README.md) for feature overview
- Monitor logs for any issues

## Need Help?

1. Check the logs for error messages
2. Verify your `.env` configuration
3. Ensure your wallet has USDC balance
4. Check Polymarket API status

Happy trading! 🚀
