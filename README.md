# NEURODEX - AI-Powered Aptos DEX Platform

A sophisticated decentralized exchange platform built on the Aptos blockchain with AI-powered transaction capabilities, comprehensive trading strategies, and advanced DeFi features.

## 🚀 Features

### AI-Powered Transactions
- **Natural Language Processing**: Execute blockchain transactions using simple English commands
- **Pattern Recognition**: Advanced AI analyzes user intent and executes appropriate actions
- **Voice Commands**: Send APT tokens with commands like "send 1.0 APT to 0x123..."
- **Smart Validation**: AI validates transactions before execution

### Wallet Integration
- **Petra Wallet Support**: Seamless integration with Petra wallet
- **Balance Display**: Real-time balance updates in the header
- **Network Detection**: Automatic network detection (Devnet/Testnet/Mainnet)
- **Transaction History**: Track all your blockchain interactions

### Trading Features  
- **Comprehensive Crypto Strategies**: 8+ detailed trading strategies including basis trading, funding rate arbitrage, and volatility trading
- **Risk Management**: Advanced risk analysis and position sizing guides
- **Real-world Examples**: Practical examples for each trading strategy
- **Educational Content**: Learn crypto derivatives and DeFi concepts

### Technical Architecture
- **Frontend**: React 18.2.0 with Vite for fast development
- **Blockchain**: Aptos blockchain integration with native APT transfers
- **AI**: Groq API integration for natural language processing
- **Styling**: Modern CSS with gradient themes and responsive design

## 📁 Project Structure

```
NEURODEX/
├── walletconnect/          # Main React frontend application
│   ├── src/
│   │   ├── services/       # Blockchain and AI services
│   │   │   ├── aptosService.js      # Aptos blockchain integration
│   │   │   ├── aiTransactionAgent.js # AI-powered transaction execution
│   │   │   └── aiBridge.js          # AI service integration
│   │   ├── App.jsx         # Main application component
│   │   └── App.css         # Application styles
│   ├── package.json
│   └── vite.config.js
├── smart contract/         # Aptos Move smart contracts
│   ├── sources/
│   ├── Move.toml
│   ├── perpetuals.move     # Perpetuals trading contract
│   ├── orderbook.move      # Order book implementation
│   └── governance.move     # DAO governance features
├── ai agent/              # AI backend services
│   ├── src/
│   ├── server/
│   └── package.json
└── README.md
```

## 🛠 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Aptos CLI
- Petra Wallet browser extension

### Frontend Setup

1. **Install dependencies:**
```bash
cd walletconnect
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env.local
# Add your API keys to .env.local
```

3. **Start development server:**
```bash
npm run dev
```

### Smart Contract Deployment

1. **Navigate to smart contract directory:**
```bash
cd "smart contract"
```

2. **Initialize Aptos:**
```bash
aptos init
```

3. **Compile contracts:**
```bash
aptos move compile
```

4. **Deploy to devnet:**
```bash
aptos move publish
```

### AI Agent Setup

1. **Install AI dependencies:**
```bash
cd "ai agent"
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Add GROQ_API_KEY to .env
```

3. **Start AI server:**
```bash
npm run dev
```

## 💡 Usage

### Basic Wallet Operations
1. Open the application at `http://localhost:5173`
2. Click "Connect Petra" in the upper right corner
3. Approve the connection in your Petra wallet
4. Your balance and address will appear in the header

### AI-Powered Transactions
Navigate to the AI Agent page and try these commands:
- `"send 1.0 APT to 0x123..."` - Transfer APT tokens
- `"check my balance"` - View wallet balance
- `"connect wallet"` - Connect to smart contract
- Ask questions about DeFi, trading, or blockchain

### Trading Strategies
Visit the Strategies page to explore:
- **Basis Trading**: Capture spot-futures price differences
- **Funding Rate Arbitrage**: Profit from perpetual swap funding
- **Volatility Trading**: Trade implied vs realized volatility
- **Momentum Strategies**: Trend-following approaches

## 🔧 Configuration

### API Keys Required
- **GROQ_API_KEY**: For AI natural language processing
- **VITE_GROQ_API_KEY**: Frontend AI integration

### Network Configuration
The application is configured for Aptos Devnet by default. To switch networks:
1. Update the RPC endpoint in `aptosService.js`
2. Redeploy smart contracts to target network
3. Update contract addresses in configuration

## 🚀 Deployment

### Frontend (Vite Build)
```bash
cd walletconnect
npm run build
# Deploy dist/ folder to your hosting provider
```

### Smart Contracts
```bash
cd "smart contract"
aptos move publish --profile mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Aptos Documentation](https://aptos.dev/)
- [Petra Wallet](https://petra.app/)
- [Groq AI](https://groq.com/)
- [React Documentation](https://react.dev/)

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ on Aptos blockchain**
