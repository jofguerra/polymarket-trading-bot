# Polymarket Copy Trading Bot - Complete Setup Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Installation](#step-by-step-installation)
4. [Configuration Details](#configuration-details)
5. [Running the Bot](#running-the-bot)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Advanced Features](#advanced-features)

## Architecture Overview

The Polymarket Copy Trading Bot is built with a modular architecture consisting of the following components:

### Core Modules

| Module | Purpose | Location |
| --- | --- | --- |
| **Config** | Loads and validates environment variables | `src/config.ts` |
| **Logger** | Provides structured logging with configurable levels | `src/logger.ts` |
| **Types** | TypeScript interfaces for type safety | `src/types.ts` |
| **CLOB Client** | HTTP client for Polymarket CLOB API | `src/api/clobClient.ts` |
| **WebSocket Client** | Real-time data streaming via WebSocket | `src/api/wsClient.ts` |
| **Trading Engine** | Core trading logic and order execution | `src/engine/tradingEngine.ts` |
| **Bot** | Main orchestrator managing all components | `src/bot.ts` |
| **Index** | Application entry point | `src/index.ts` |

### Data Flow

```
Source Trader Activity
        ↓
WebSocket/CLOB API
        ↓
Trading Engine (Analyzes & Scales)
        ↓
Order Placement (CLOB API)
        ↓
Position Tracking & Management
```

## Prerequisites

Before you begin, ensure you have:

1. **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
2. **npm**: Comes with Node.js
3. **A Polygon wallet**: With USDC balance for trading
4. **Polymarket account**: Access to Polymarket.com
5. **RPC Endpoint**: From Infura, Alchemy, or another provider

## Step-by-Step Installation

### Step 1: Clone or Download the Project

```bash
# If cloning from git
git clone <repository_url>
cd polymarket-trading-bot

# Or if you have the files locally
cd polymarket-trading-bot
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages:
- `axios`: HTTP client for API requests
- `dotenv`: Environment variable management
- `ethers`: Ethereum/Polygon blockchain interaction
- `ws`: WebSocket client
- `typescript`: TypeScript compiler
- Development dependencies for linting and formatting

### Step 3: Create Environment Configuration

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration (see [Configuration Details](#configuration-details) below).

### Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Configuration Details

### Essential Configuration

#### Wallet Configuration

```env
USER_ADDRESS=0xYourSourceTraderAddress
PROXY_WALLET=0xYourWalletAddress
PRIVATE_KEY=your_private_key_without_0x_prefix
```

- **USER_ADDRESS**: The wallet address of the trader whose trades you want to copy
- **PROXY_WALLET**: Your own wallet address where trades will be executed
- **PRIVATE_KEY**: Your wallet's private key (keep this absolutely secret)

**⚠️ Security Warning**: Never commit your `.env` file to version control. The `.gitignore` file already excludes it, but double-check before pushing to any repository.

#### API Endpoints

```env
CLOB_HTTP_URL=https://clob.polymarket.com/
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws
```

These are the official Polymarket endpoints. You typically don't need to change these unless Polymarket updates them.

#### Trading Parameters

```env
FETCH_INTERVAL=1
TOO_OLD_TIMESTAMP=3600
RETRY_LIMIT=3
```

- **FETCH_INTERVAL**: How often (in seconds) to check for new trades from the source trader. Lower values mean more frequent checks but higher API usage.
- **TOO_OLD_TIMESTAMP**: Maximum age of a trade in seconds to be considered for copying. Trades older than this are ignored.
- **RETRY_LIMIT**: Number of times to retry failed API requests before giving up.

#### Risk Management

```env
MAX_POSITION_SIZE=1000
RISK_PERCENTAGE=2
SLIPPAGE_TOLERANCE=0.5
```

- **MAX_POSITION_SIZE**: Maximum size of any single position in USDC
- **RISK_PERCENTAGE**: Percentage of the source trader's trade size to execute (e.g., 2 = 2% of their trade)
- **SLIPPAGE_TOLERANCE**: Acceptable price slippage as a percentage

#### Blockchain Configuration

```env
RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

- **RPC_URL**: Your Polygon RPC endpoint (get one free from [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/))
- **USDC_CONTRACT_ADDRESS**: The USDC contract on Polygon (usually doesn't need to change)

#### Optional: Database Configuration

```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/polymarket_copytrading
```

For storing trade history and logs (optional, not required for basic operation).

#### Logging

```env
LOG_LEVEL=info
```

Options: `debug`, `info`, `warn`, `error`

## Running the Bot

### Production Mode

```bash
npm run start
```

This runs the compiled bot from the `dist/` directory.

### Development Mode

```bash
npm run dev
```

This runs the bot directly with TypeScript, useful for development and debugging.

### Expected Output

When the bot starts successfully, you should see:

```
[2026-01-07T18:45:30.123Z] [INFO] Initializing Polymarket Copy Trading Bot
[2026-01-07T18:45:30.456Z] [INFO] Configuration validated
[2026-01-07T18:45:31.789Z] [INFO] Starting Polymarket Copy Trading Bot
[2026-01-07T18:45:32.012Z] [INFO] WebSocket connected
[2026-01-07T18:45:32.345Z] [INFO] Bot started successfully
[2026-01-07T18:45:32.678Z] [INFO] Monitoring started { interval: 1000 }
[2026-01-07T18:45:32.901Z] [INFO] Position updates started { interval: 30000 }
```

## Monitoring and Troubleshooting

### Viewing Logs

The bot outputs logs to the console. You can redirect them to a file for persistent logging:

```bash
npm run start > bot.log 2>&1 &
```

### Common Issues

#### Issue: "Missing required environment variable"

**Solution**: Ensure all required variables are set in your `.env` file. Check the Configuration Details section above.

#### Issue: "CLOB API health check failed"

**Solution**: 
- Verify your internet connection
- Check if Polymarket's API is operational
- Verify the `CLOB_HTTP_URL` is correct

#### Issue: "Invalid USER_ADDRESS configuration"

**Solution**: Ensure `USER_ADDRESS` is a valid Ethereum address starting with `0x` followed by 40 hexadecimal characters.

#### Issue: WebSocket connection fails

**Solution**:
- The bot will automatically attempt to reconnect with exponential backoff
- Check your firewall settings
- Verify the `CLOB_WS_URL` is accessible

### Monitoring Commands

Check bot status every minute:

```bash
# View last 50 lines of logs
tail -f bot.log | tail -50

# Count total errors
grep "ERROR" bot.log | wc -l

# View all trades executed
grep "Copy trade executed" bot.log
```

## Advanced Features

### Custom Risk Scaling

Modify the `calculateOrderSize()` method in `src/engine/tradingEngine.ts` to implement custom position sizing logic.

### Market Filtering

Add market filtering in `monitorAndCopyTrades()` to only copy trades in specific markets.

### Position Limits

Implement maximum position limits by modifying the `executeCopyTrade()` method.

### Webhook Notifications

Add webhook support to send notifications when trades are executed or errors occur.

### Database Integration

Connect MongoDB to store trade history for analysis and backtesting.

## Support and Troubleshooting

For issues or questions:

1. Check the logs for error messages
2. Verify your configuration is correct
3. Test API connectivity manually using curl
4. Review the Polymarket documentation at [docs.polymarket.com](https://docs.polymarket.com)

## Disclaimer

This bot is provided as-is for educational and informational purposes. Trading in prediction markets involves significant financial risk. Always:

- Start with small position sizes
- Test thoroughly before using with real funds
- Monitor the bot regularly
- Never share your private keys
- Understand the risks involved in prediction market trading

Good luck with your trading! 🚀
