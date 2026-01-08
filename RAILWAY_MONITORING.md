# Railway.app Monitoring & Troubleshooting Guide

This guide explains how to monitor your Polymarket trading bot running on Railway.app and troubleshoot common issues.

## Accessing Your Railway Dashboard

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click on your **Polymarket Trading Bot** project
3. Select the **Service** (your bot application)

You'll see several tabs and metrics available for monitoring.

---

## Monitoring Your Bot

### 1. Viewing Logs

The **Logs** tab shows real-time output from your bot, including all console messages.

**What to look for**:

- **Successful startup**: Look for messages like `Bot started successfully` and `Monitoring started`
- **Active trading**: You should see periodic messages about trades being monitored
- **Errors**: Any error messages will appear in red

**Example healthy log output**:

```
[2026-01-07T19:00:00.123Z] [INFO] Initializing Polymarket Copy Trading Bot
[2026-01-07T19:00:01.456Z] [INFO] Configuration validated
[2026-01-07T19:00:02.789Z] [INFO] Starting Polymarket Copy Trading Bot
[2026-01-07T19:00:03.012Z] [INFO] WebSocket connected
[2026-01-07T19:00:03.345Z] [INFO] Bot started successfully
[2026-01-07T19:00:03.678Z] [INFO] Monitoring started { interval: 1000 }
[2026-01-07T19:00:03.901Z] [INFO] Position updates started { interval: 30000 }
[2026-01-07T19:00:04.234Z] [INFO] Bot status { running: true, activePositions: 0, activeOrders: 0 }
```

### 2. Checking Deployments

The **Deployments** tab shows the history of your bot deployments.

- **Green checkmark**: Deployment was successful
- **Red X**: Deployment failed
- **Click on a deployment**: View build logs and runtime logs

### 3. Monitoring Resource Usage

The **Metrics** tab shows:

- **CPU Usage**: How much processing power your bot is using
- **Memory Usage**: How much RAM your bot is consuming
- **Network**: Data sent and received

**Expected values**:
- CPU: Usually 5-15% (low usage since the bot mostly waits for trades)
- Memory: Typically 50-150 MB
- Network: Minimal, as the bot only communicates with Polymarket APIs

### 4. Checking Service Status

Look at the **Status** indicator at the top of your service page:

- **Green "Running"**: Bot is active and healthy
- **Yellow "Building"**: Bot is being deployed
- **Red "Failed"**: Something went wrong

---

## Common Issues and Solutions

### Issue 1: Bot Crashes Immediately After Starting

**Symptoms**: Deployment shows as successful, but logs show the bot stopping after a few seconds.

**Possible Causes**:
- Missing or invalid environment variables
- Invalid wallet address or private key
- Network connectivity issues

**Solution**:
1. Check your environment variables in the Railway dashboard
2. Verify all required variables are set (see DEPLOY_ON_RAILWAY.md)
3. Ensure your wallet addresses are valid Ethereum addresses (starting with `0x`)
4. Check if your RPC URL is accessible

### Issue 2: "Missing required environment variable"

**Symptoms**: Log shows `Missing required environment variable: USER_ADDRESS` (or another variable)

**Solution**:
1. Go to your service's **Variables** tab
2. Add the missing variable
3. Railway will automatically redeploy with the new variable

### Issue 3: "CLOB API health check failed"

**Symptoms**: Bot starts but immediately fails with health check error

**Solution**:
1. This usually means Polymarket's API is temporarily down or unreachable
2. Check [Polymarket status page](https://status.polymarket.com/)
3. Wait a few minutes and check the logs again
4. If the issue persists, verify your internet connection

### Issue 4: WebSocket Connection Fails

**Symptoms**: Logs show repeated WebSocket connection errors

**Solution**:
1. This is usually temporary; the bot has automatic reconnection logic
2. Check your firewall/network settings
3. Verify the `CLOB_WS_URL` is correct in your variables
4. Wait for automatic reconnection (exponential backoff)

### Issue 5: Bot Uses Too Much Memory or CPU

**Symptoms**: Metrics show high resource usage

**Solution**:
1. Increase `FETCH_INTERVAL` to reduce how often the bot checks for trades
2. Reduce `MAX_POSITION_SIZE` to limit order complexity
3. Check if there are memory leaks by reviewing logs for repeated error patterns
4. Consider upgrading to a higher tier Railway plan

### Issue 6: No Trades Being Executed

**Symptoms**: Bot is running but you don't see any trade execution in logs

**Possible Causes**:
- The source trader (`USER_ADDRESS`) hasn't made any trades recently
- Your `RISK_PERCENTAGE` is too low
- Your wallet doesn't have enough USDC balance
- Orders are failing due to market conditions

**Solution**:
1. Check if the source trader has made recent trades on Polymarket
2. Verify your wallet has sufficient USDC balance
3. Check logs for order placement errors
4. Try increasing `RISK_PERCENTAGE` temporarily for testing
5. Verify market conditions aren't preventing order execution

---

## Maintenance Tasks

### Weekly Checks

1. **Review Logs**: Scan for any error patterns
2. **Check Metrics**: Ensure resource usage is reasonable
3. **Verify Positions**: Make sure your bot's positions match your expectations
4. **Check Balance**: Ensure your wallet has sufficient funds

### Monthly Tasks

1. **Review Performance**: Analyze trade execution and profitability
2. **Update Configuration**: Adjust `RISK_PERCENTAGE` or other parameters if needed
3. **Check for Updates**: Look for any Polymarket API changes

### When Deploying Updates

1. **Test Locally First**: Always test changes on your local machine before deploying
2. **Push to GitHub**: Commit and push your changes
3. **Monitor Deployment**: Watch the logs as Railway redeploys
4. **Verify Functionality**: Check that the bot resumes normal operation

---

## Enabling Advanced Logging

If you need more detailed debugging information:

1. Go to your service's **Variables** tab
2. Change `LOG_LEVEL` from `info` to `debug`
3. Railway will redeploy with debug logging enabled
4. Check logs for detailed API calls and internal operations

**Warning**: Debug logging produces more output and may impact performance. Switch back to `info` after debugging.

---

## Setting Up Alerts (Optional)

Railway allows you to set up notifications for deployment failures:

1. Go to your **Project Settings**
2. Click **Notifications**
3. Configure email or webhook alerts for deployment failures
4. You'll be notified if your bot fails to deploy

---

## Restarting Your Bot

If you need to restart your bot:

1. Go to your service page
2. Click the **⋮** (three dots) menu
3. Select **Restart Service**
4. Railway will restart the bot immediately

---

## Viewing Deployment History

To see all past deployments:

1. Click on the **Deployments** tab
2. Scroll through the list to see previous deployments
3. Click on any deployment to view its logs
4. Use this to identify when issues started occurring

---

## Getting Help

If you encounter issues not covered here:

1. **Check Railway Documentation**: [railway.app/docs](https://railway.app/docs)
2. **Review Bot Logs**: Most issues are evident from the logs
3. **Check Polymarket Status**: [status.polymarket.com](https://status.polymarket.com/)
4. **Verify Configuration**: Double-check all environment variables

---

## Summary

Your Polymarket trading bot is now running on Railway.app! Monitor it regularly using the dashboard, watch for any errors in the logs, and maintain your wallet balance. Railway's automatic restart and deployment features ensure your bot keeps running smoothly.

Happy trading! 🚀
