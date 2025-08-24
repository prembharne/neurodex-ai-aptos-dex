# 🚀 Aptos Move Smart Contract Integration

Production-ready React frontend integration for your Aptos Move smart contracts with AI-powered trading.

## ✨ Features

### 🔗 Wallet Integration
- **Petra Wallet** - Full integration with auto-reconnect
- **Martian Wallet** - Complete support with account switching
- **Network Detection** - Automatic testnet/mainnet switching
- **Transaction Signing** - Secure client-side signing

### 📋 Smart Contract Hooks
- **`useVault`** - Deposit/withdraw with balance tracking
- **`useOrderBook`** - Place orders, cancel orders, real-time orderbook
- **`usePerpetuals`** - Open/close positions, leverage, PnL tracking  
- **`useLiquidation`** - Health monitoring, liquidation execution
- **`useGovernance`** - Create proposals, voting, execution
- **`useAIExecutor`** - AI-powered trade suggestions & execution

### 🤖 AI Integration
- **Natural Language Trading** - "Go long APT with 2x leverage"
- **Risk Analysis** - Automated position risk assessment  
- **Trade Suggestions** - Context-aware trading recommendations
- **Execution Confirmation** - User approval before blockchain transactions

### 📊 Real-time Data
- **Mark Prices** - Live price feeds for all markets
- **Position Updates** - Real-time PnL and liquidation prices
- **Order Book** - Live bid/ask updates  
- **Health Factors** - Continuous risk monitoring

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @aptos-labs/ts-sdk react-router-dom
```

### 2. Configure Contract Addresses

Update `src/config/contractConfig.js`:

```javascript
export const CONTRACT_CONFIG = {
  VAULT: {
    address: "0x123456789abcdef", // Your deployed address
    moduleName: "Vault",
    // ... functions
  },
  // ... other contracts
};
```

### 3. Set Environment Variables

Create `.env.local`:

```bash
REACT_APP_AI_AGENT_API=http://localhost:3004/api
REACT_APP_VAULT_ADDRESS=0xYOUR_VAULT_ADDRESS
REACT_APP_NETWORK=testnet
```

### 4. Replace Your App.jsx

```jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import TradingDashboard from './components/TradingDashboard';

function App() {
  return (
    <Router>
      <TradingDashboard />
    </Router>
  );
}

export default App;
```

### 5. Start Development

```bash
npm run dev
```

## 📖 Usage Examples

### Basic Wallet Connection

```jsx
import useWallet from './hooks/useWallet';

function WalletExample() {
  const { connected, address, connectWallet } = useWallet();
  
  return (
    <div>
      {connected ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={() => connectWallet('petra')}>
          Connect Petra
        </button>
      )}
    </div>
  );
}
```

### Vault Operations

```jsx
import useVault from './hooks/useVault';

function VaultExample() {
  const { deposit, userBalance, loading } = useVault();
  
  const handleDeposit = async () => {
    try {
      await deposit('10', 'APT');
      alert('Deposit successful!');
    } catch (error) {
      alert('Deposit failed: ' + error.message);
    }
  };
  
  return (
    <div>
      <p>Balance: {userBalance} APT</p>
      <button onClick={handleDeposit} disabled={loading}>
        Deposit 10 APT
      </button>
    </div>
  );
}
```

### AI-Powered Trading

```jsx
import useAIExecutor from './hooks/useAIExecutor';

function AITradingExample() {
  const { getAITradeSuggestion, executeAITrade, aiSuggestion } = useAIExecutor();
  
  const askAI = async () => {
    const suggestion = await getAITradeSuggestion(
      "I want to go long on APT with 2x leverage using 100 USDC"
    );
    console.log('AI suggests:', suggestion);
  };
  
  const executeTrade = async () => {
    if (aiSuggestion) {
      await executeAITrade(aiSuggestion, { riskAccepted: true });
    }
  };
  
  return (
    <div>
      <button onClick={askAI}>Get AI Suggestion</button>
      {aiSuggestion && (
        <div>
          <p>{aiSuggestion.reasoning}</p>
          <button onClick={executeTrade}>Execute Trade</button>
        </div>
      )}
    </div>
  );
}
```

### Perpetual Positions

```jsx
import usePerpetuals from './hooks/usePerpetuals';

function PerpetualsExample() {
  const { openPosition, closePosition, userPositions } = usePerpetuals();
  
  const openLong = async () => {
    await openPosition({
      market: 'APT-USDC',
      side: 'long',
      size: '10',
      leverage: 2,
      margin: '50'
    });
  };
  
  return (
    <div>
      <button onClick={openLong}>Open Long Position</button>
      <div>
        {userPositions.map(pos => (
          <div key={pos.id}>
            {pos.market} - {pos.side} - {pos.size} APT
            <button onClick={() => closePosition({
              positionId: pos.id,
              market: pos.market
            })}>
              Close
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Order Book Trading

```jsx
import useOrderBook from './hooks/useOrderBook';

function OrderBookExample() {
  const { placeOrder, orderBook, userOrders } = useOrderBook();
  
  const placeBuyOrder = async () => {
    await placeOrder({
      side: 'buy',
      amount: '10',
      price: '5.50',
      baseToken: 'APT',
      quoteToken: 'USDC'
    });
  };
  
  return (
    <div>
      <button onClick={placeBuyOrder}>
        Buy 10 APT at $5.50
      </button>
      
      <div>
        <h3>Order Book</h3>
        <div>
          {orderBook.asks.map((ask, i) => (
            <div key={i}>{ask.price} - {ask.amount}</div>
          ))}
        </div>
      </div>
      
      <div>
        <h3>My Orders</h3>
        {userOrders.map(order => (
          <div key={order.id}>
            {order.side} {order.amount} at {order.price}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎛 Available Hooks

| Hook | Purpose | Key Functions |
|------|---------|---------------|
| `useWallet` | Wallet connection | `connectWallet()`, `signAndSubmitTransaction()` |
| `useVault` | Vault operations | `deposit()`, `withdraw()`, `fetchUserBalance()` |
| `useOrderBook` | Spot trading | `placeOrder()`, `cancelOrder()`, `fetchOrderBook()` |
| `usePerpetuals` | Leveraged trading | `openPosition()`, `closePosition()`, `fetchMarkPrice()` |
| `useLiquidation` | Risk management | `executeLiquidation()`, `fetchUserHealthFactor()` |
| `useGovernance` | DAO voting | `createProposal()`, `vote()`, `executeProposal()` |
| `useAIExecutor` | AI trading | `getAITradeSuggestion()`, `executeAITrade()` |

## 🎯 Demo Script (5 minutes)

Perfect for hackathon presentations:

### 1. Wallet Connection (30s)
```jsx
// Show connecting Petra wallet
// Display connected address
```

### 2. Vault Operations (1min)
```jsx
// Deposit 10 APT to vault
// Show balance update in real-time
// Withdraw 5 APT back
```

### 3. AI Trading (2min)
```jsx
// Ask AI: "Should I go long on APT with 2x leverage?"
// Show AI analysis and suggested trade
// Execute the suggested trade with user confirmation
// Display transaction hash
```

### 4. Position Monitoring (1min)
```jsx
// Show the opened position
// Display real-time mark price updates  
// Show unrealized PnL changes
// Display health factor
```

### 5. Advanced Features (30s)
```jsx
// Place a limit order on the orderbook
// Show governance proposal voting interface
```

## 🔧 Configuration

### Environment Variables

```bash
# Required
REACT_APP_AI_AGENT_API=http://localhost:3004/api

# Contract addresses (update with your deployed addresses)
REACT_APP_VAULT_ADDRESS=0x123...
REACT_APP_ORDERBOOK_ADDRESS=0x456...
REACT_APP_PERPETUALS_ADDRESS=0x789...
REACT_APP_LIQUIDATION_ADDRESS=0xabc...
REACT_APP_GOVERNANCE_ADDRESS=0xdef...
REACT_APP_AI_EXECUTOR_ADDRESS=0x321...

# Optional
REACT_APP_NETWORK=testnet
REACT_APP_ENABLE_AI_TRADING=true
```

### Contract Configuration

Update `src/config/contractConfig.js` with your deployed module addresses and function names.

## 📱 Mobile Support

The interface is fully responsive and supports:

- **Petra Mobile Wallet** - via WalletConnect
- **Martian Mobile Wallet** - via deep links
- **Touch-optimized UI** - for mobile trading

## 🛠 Error Handling

All hooks include comprehensive error handling:

```jsx
const { deposit, error, loading } = useVault();

if (error) {
  // Display error to user
  console.error('Vault error:', error);
}

if (loading) {
  // Show loading state
}
```

## 🔒 Security Features

- **Client-side signing only** - Private keys never leave user's wallet
- **Transaction simulation** - Preview before execution
- **Slippage protection** - Configurable slippage limits
- **Risk warnings** - Clear risk indicators for leveraged positions

## 📈 Production Checklist

- [ ] Update all contract addresses in config
- [ ] Set up proper environment variables
- [ ] Test all wallet connections
- [ ] Verify transaction flows
- [ ] Test error scenarios
- [ ] Add monitoring and alerting
- [ ] Set up mainnet configurations

## 🆘 Troubleshooting

### Common Issues

1. **"Wallet not found"**
   - Install Petra or Martian wallet extension
   - Refresh page after installation

2. **"Transaction failed"**
   - Check APT balance for gas fees
   - Verify contract addresses are correct
   - Check network (testnet vs mainnet)

3. **"AI not responding"**
   - Verify backend is running on correct port
   - Check DEEPSEEK_API_KEY environment variable
   - Look at browser network tab for API errors

4. **"Data not updating"**
   - Refresh page to reset hook state
   - Check contract function names match deployment
   - Verify function arguments are correct

### Debug Mode

Enable debug logging:

```bash
REACT_APP_DEBUG=true npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**🎉 Your Aptos Move smart contracts are now fully integrated with a production-ready React frontend!**

Ready for hackathons, demos, and production deployment.
