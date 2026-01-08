> **Note**: This guide assumes you have already received the `polymarket-trading-bot-complete.tar.gz` file and have it on your local machine.

# 🚀 Deploying Your Polymarket Bot on Railway.app

This guide provides a complete, step-by-step walkthrough for deploying your Polymarket trading bot on **[Railway.app](https://railway.app/)**. Railway is an excellent choice for this bot because it allows for persistent, long-running services, which are essential for a 24/7 trading bot.

## Why Railway.app?

- **Persistent Services**: Unlike serverless platforms (like Vercel), Railway can run your bot continuously without shutting it down.
- **Easy GitHub Integration**: Automatically deploys your bot whenever you push changes to your repository.
- **Simple Configuration**: Managing environment variables and settings is straightforward.
- **Generous Free Tier & Affordable Pricing**: Railway offers a starter plan that is often sufficient for a single bot, with predictable pricing if you need more resources.

---

## Prerequisites

Before you start, make sure you have the following:

1.  **A GitHub Account**: You will need a repository to store your bot's code.
2.  **A Railway.app Account**: Sign up for free using your GitHub account.
3.  **The Bot Project Files**: You should have the `polymarket-trading-bot` directory extracted from the archive I sent you.
4.  **Git Installed**: You need Git to push your code to GitHub. [Download Git](https://git-scm.com/downloads).

---

##  Deployment Steps

### Step 1: Prepare Your Project and Push to GitHub

First, you need to get the bot's code into a GitHub repository.

1.  **Initialize a Git Repository**:
    Open your terminal, navigate into the `polymarket-trading-bot` directory, and initialize a new Git repository.

    ```bash
    cd path/to/polymarket-trading-bot
    git init
    git add .
    git commit -m "Initial commit: Polymarket Trading Bot"
    ```

2.  **Create a New GitHub Repository**:
    Go to [GitHub](https://github.com/new) and create a new **private** repository. It is critical to make it **private** to protect your trading logic and configurations.

3.  **Push Your Code to GitHub**:
    Follow the instructions on GitHub to push your local repository to the remote one you just created.

    ```bash
    # Replace <YOUR_GITHUB_REPO_URL> with the URL from GitHub
    git remote add origin <YOUR_GITHUB_REPO_URL>
    git branch -M main
    git push -u origin main
    ```

### Step 2: Create and Configure Your Railway Project

Now, let's set up the project on Railway.

1.  **Create a New Project**:
    - Log in to your [Railway dashboard](https://railway.app/dashboard).
    - Click **New Project**.
    - Select **Deploy from GitHub repo**.

2.  **Select Your Repository**:
    - Railway will ask for permission to access your GitHub repositories. Grant it.
    - Find and select the private repository you just created for your bot.

3.  **Automatic Configuration**:
    Railway will automatically detect the `package.json` file and configure it as a Node.js application. It will use the `build` and `start` scripts defined in your `package.json`:
    - **Build Command**: `npm run build`
    - **Start Command**: `npm run start`

    You typically don't need to change these.

### Step 3: Add Environment Variables

This is the most critical step. You must provide your bot with the necessary secrets and configuration to run.

1.  **Navigate to Variables**:
    In your Railway project dashboard, click on the service that was created, and then go to the **Variables** tab.

2.  **Add Secrets**:
    You need to add all the variables from your local `.env.example` file. Click **New Variable** and add them one by one. Select the "Secret" checkbox for sensitive values.

    **⚠️ IMPORTANT**: Add these variables directly in the Railway UI. **DO NOT** commit your `.env` file to GitHub.

    | Variable Name           | Example Value                                    | Secret? |
    | ----------------------- | ------------------------------------------------ | :-----: |
    | `USER_ADDRESS`          | `0xYourSourceTraderAddress`                      |   No    |
    | `PROXY_WALLET`          | `0xYourWalletAddress`                            |   No    |
    | `PRIVATE_KEY`           | `your_wallet_private_key_without_0x`             |   Yes   |
    | `RPC_URL`               | `https://polygon-mainnet.infura.io/v3/YOUR_KEY`  |   Yes   |
    | `FETCH_INTERVAL`        | `1`                                              |   No    |
    | `RISK_PERCENTAGE`       | `2`                                              |   No    |
    | `MAX_POSITION_SIZE`     | `1000`                                           |   No    |
    | `SLIPPAGE_TOLERANCE`    | `0.5`                                            |   No    |
    | `LOG_LEVEL`             | `info`                                           |   No    |
    | `CLOB_HTTP_URL`         | `https://clob.polymarket.com/`                   |   No    |
    | `CLOB_WS_URL`           | `wss://ws-subscriptions-clob.polymarket.com/ws`  |   No    |
    | `USDC_CONTRACT_ADDRESS` | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`     |   No    |

### Step 4: Deploy and Monitor

1.  **Automatic Deployment**:
    As soon as you add the variables, Railway will trigger a new deployment. Any future pushes to your `main` branch on GitHub will also automatically trigger a new deployment.

2.  **View Logs**:
    - Go to the **Deployments** tab in your Railway project.
    - Click on the latest deployment to view the build and application logs.
    - You should see the same output as when you run the bot locally, indicating that it has started successfully.

    ```log
    [2026-01-07T19:00:00.123Z] [INFO] Initializing Polymarket Copy Trading Bot
    [2026-01-07T19:00:01.456Z] [INFO] Bot started successfully
    [2026-01-07T19:00:01.789Z] [INFO] Monitoring started { interval: 1000 }
    ```

### Step 5: Ensure Continuous Operation

By default, Railway services might sleep on the free plan if they don't receive traffic. Since this bot doesn't have an HTTP server, you need to ensure it runs 24/7.

- **Upgrade to a Paid Plan**: The most reliable way to ensure 24/7 operation is to upgrade to a paid plan (like the "Developer" plan). This is very affordable and prevents your service from sleeping.
- **No Health Check URL Needed**: This bot is a background worker, so you don't need to expose a port or set a health check URL. Railway monitors the process directly.

---

## Congratulations!

Your Polymarket trading bot is now deployed and running continuously on Railway.app. It will automatically restart if it crashes and redeploy whenever you push updates to your GitHub repository. Remember to monitor the logs periodically to ensure everything is running smoothly.
