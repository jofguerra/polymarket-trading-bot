# Polymarket Copy Trading Bot

This project provides a sophisticated and customizable copy trading bot for the Polymarket prediction market. It allows you to automatically mirror the trades of a designated trader, enabling you to leverage their strategies and market insights without manual intervention.

## Features

- **Automated Copy Trading**: Automatically monitor a specified trader and execute identical trades in your own account.
- **Real-Time Monitoring**: Utilizes WebSocket for low-latency monitoring of market data and trade execution.
- **Risk Management**: Configurable settings for position sizing, risk percentage, and slippage tolerance to protect your capital.
- **Resilient and Robust**: Includes error handling, reconnection logic, and health checks to ensure continuous operation.
- **Extensible**: Built with a modular architecture in TypeScript, making it easy to customize and extend with new features.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

## Installation

1.  **Clone the repository**:

    ```bash
    git clone <repository_url>
    cd polymarket-trading-bot
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

## Configuration

1.  **Create a `.env` file** by copying the example file:

    ```bash
    cp .env.example .env
    ```

2.  **Edit the `.env` file** with your specific configuration. Below is a detailed explanation of each variable:

    | Variable                | Description                                                                                                 |
    | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
    | `USER_ADDRESS`          | The wallet address of the trader you want to copy.                                                          |
    | `PROXY_WALLET`          | Your own Polymarket account address where trades will be executed.                                          |
    | `PRIVATE_KEY`           | The private key of your `PROXY_WALLET`. **Keep this secure and never share it.**                            |
    | `CLOB_HTTP_URL`         | The HTTP endpoint for the Polymarket CLOB API. (Default: `https://clob.polymarket.com/`)                      |
    | `CLOB_WS_URL`           | The WebSocket endpoint for real-time updates. (Default: `wss://ws-subscriptions-clob.polymarket.com/ws`)      |
    | `FETCH_INTERVAL`        | The interval in seconds to check for new trades from the source trader. (Default: `1`)                      |
    | `TOO_OLD_TIMESTAMP`     | The maximum age of a trade in seconds to be considered for copying. (Default: `3600`)                       |
    | `RETRY_LIMIT`           | The number of times to retry a failed API request. (Default: `3`)                                           |
    | `MONGO_URI`             | Your MongoDB connection string for storing trade history and logs (optional).                               |
    | `RPC_URL`               | The URL of a Polygon RPC endpoint (e.g., from Infura or Alchemy).                                           |
    | `USDC_CONTRACT_ADDRESS` | The contract address for USDC on the Polygon network.                                                       |
    | `MAX_POSITION_SIZE`     | The maximum size of a single position in USDC. (Default: `1000`)                                            |
    | `RISK_PERCENTAGE`       | The percentage of the source trader's trade size to execute. (e.g., `50` for 50%). (Default: `100`)          |
    | `SLIPPAGE_TOLERANCE`    | The percentage of price slippage you are willing to tolerate. (Default: `0.5`)                              |
    | `LOG_LEVEL`             | The logging level (`debug`, `info`, `warn`, `error`). (Default: `info`)                                     |

## Usage

1.  **Build the project**:

    ```bash
    npm run build
    ```

2.  **Start the bot**:

    ```bash
    npm run start
    ```

    The bot will now be running, monitoring the specified trader, and executing trades according to your configuration.

3.  **Development Mode**:

    To run the bot in development mode with hot-reloading, use:

    ```bash
    npm run dev
    ```

## Disclaimer

Trading in financial markets, including prediction markets, involves significant risk. This bot is provided as-is, and the user assumes all responsibility for its use. The creators of this bot are not liable for any financial losses incurred. Always trade responsibly and never risk more than you can afford to lose.
