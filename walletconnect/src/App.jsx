import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import ContractExplorer from './components/ContractExplorer.jsx'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

// Basic Petra wallet detection helpers
function getPetra() {
  if (typeof window !== 'undefined') {
    return window.aptos // Petra injects window.aptos
  }
  return null
}

const aptosClient = new Aptos(new AptosConfig({ network: Network.MAINNET }))

// Types (lightweight to avoid TS dependency in JSX file)
// address: string | null

function usePetraWallet() {
  const [address, setAddress] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  const refreshAccount = useCallback(async () => {
    try {
      const petra = getPetra()
      if (!petra) return
      const connected = await petra.isConnected?.()
      if (connected) {
        const acc = await petra.account()
        setAddress(acc.address)
      } else {
        setAddress(null)
      }
    } catch (e) {
      console.warn('Petra refresh failed', e)
    }
  }, [])

  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const petra = getPetra()
      if (!petra) throw new Error('Petra wallet not found. Install the Petra extension.')
      const res = await petra.connect()
      setAddress(res.address)
    } catch (e) {
      setError(e.message || 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      const petra = getPetra()
      if (petra && petra.disconnect) await petra.disconnect()
    } catch (_) {}
    setAddress(null)
  }, [])

  // Listen to Petra events
  useEffect(() => {
    const petra = getPetra()
    if (!petra || !petra.on) return
    const handleAccountChange = (acc) => {
      if (acc?.address) setAddress(acc.address)
      else setAddress(null)
    }
    const handleDisconnect = () => setAddress(null)
    petra.on('accountChange', handleAccountChange)
    petra.on('disconnect', handleDisconnect)
    refreshAccount()
    return () => {
      try {
        petra.removeListener?.('accountChange', handleAccountChange)
        petra.removeListener?.('disconnect', handleDisconnect)
      } catch (_) {}
    }
  }, [refreshAccount])

  return { address, isConnected: !!address, connect, disconnect, isConnecting, error }
}

function WalletButton({ wallet }) {
  const { address, isConnected, connect, disconnect, isConnecting, error } = wallet
  const [balance, setBalance] = useState(null)
  const [network] = useState('Devnet') // Since we're using devnet
  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  // Fetch balance when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [isConnected, address])

  const fetchBalance = async () => {
    try {
      const aptosService = await import('./services/aptosService.js')
      const balanceResult = await aptosService.default.getWalletBalance(address)
      if (balanceResult.success) {
        setBalance(balanceResult.formattedBalance)
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error)
    }
  }

  return (
    <div className="wallet-btn-container">
      {!isConnected ? (
        <button className="wallet-btn" onClick={connect} disabled={isConnecting}>
          {isConnecting ? 'Connecting…' : 'Connect Petra'}
        </button>
      ) : (
        <div className="wallet-connected-info">
          <div className="wallet-details">
            <div className="wallet-address">{short}</div>
            <div className="wallet-meta">
              <span className="network-badge">{network}</span>
              {balance && <span className="balance-display">{balance}</span>}
            </div>
          </div>
          <button className="wallet-disconnect-btn" onClick={disconnect} title="Disconnect">
            ⚡
          </button>
        </div>
      )}
      {error && <div style={{ marginTop: '8px', fontSize: '12px', color: '#ff6b6b', textAlign: 'center' }}>{error}</div>}
    </div>
  )
}

function Header({ wallet }) {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-3d" aria-hidden="true">
          <div className="neuro-core"></div>
          <div className="ring ring-a"></div>
          <div className="ring ring-b"></div>
          <div className="ring ring-c"></div>
          <div className="neuro-pulse"></div>
        </div>
        <span className="logo-text">NEURODEX</span>
      </div>
      <nav className="nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li className="dropdown">
            <span>Features ▾</span>
            <div className="dropdown-menu">
              <Link to="/features/ai-agent">AI Agent</Link>
              <Link to="/features/strategies">Strategies</Link>
              <Link to="/features/dex">DEX</Link>
            </div>
          </li>
          <li className="dropdown">
            <span>Trading ▾</span>
            <div className="dropdown-menu">
              <Link to="/trading/spot">Spot</Link>
              <Link to="/trading/margin">Margin</Link>
              <Link to="/trading/perpetuals">Perpetuals</Link>
            </div>
          </li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
      <WalletButton wallet={wallet} />
    </header>
  )
}

function HeroSection({ wallet }) {
  const { isConnected, address } = wallet

  return (
    <section id="home" className="hero">
      <div className="hero-bg-effects"></div>
      <div className="hero-content">
        <h1>Welcome to <span className="highlight">NEURODEX</span></h1>
        <p className="hero-subtitle">
          Aptos-Native <span className="highlight">Perpetual DEX</span> with AI Agent Integration. 
          Execute trades with <span className="highlight">natural language commands</span> on fully on-chain infrastructure.
        </p>
        {isConnected && (
          <div className="connection-status">
            <div className="status-indicator"></div>
            <span>Wallet Connected: {address?.slice(0, 8)}...{address?.slice(-6)}</span>
          </div>
        )}
        <div className="hero-buttons">
          <a href="#trading" className="btn primary">Trade Perpetuals</a>
          <a href="#about" className="btn secondary">Learn About AI</a>
        </div>
      </div>
      <div className="floating-elements">
        <div className="float-1"></div>
        <div className="float-2"></div>
        <div className="float-3"></div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="section">
      <div className="section-container">
        <h2>AI-Powered <span className="highlight">Features</span></h2>
        <div className="about-grid">
          <div className="feature-card">
            <div className="card-icon">�</div>
            <h3>AI Trading Assistant</h3>
            <p>Execute trades with natural language commands. "Long 5x APT/USDC with 100 USDC collateral" - our AI understands and executes instantly.</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">⚡</div>
            <h3>Aptos-Native Performance</h3>
            <p>Powered by Aptos's parallel execution and Block-STM for lightning-fast perpetual trading with minimal fees.</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">🛡️</div>
            <h3>Smart Risk Management</h3>
            <p>AI warns about liquidation risks, over-leverage, and automates stop-loss, take-profit, and portfolio rebalancing.</p>
          </div>
        </div>
  <div className="ai-agent-section">
          <h3 className="subheading">AI Agent Capabilities</h3>
          <div className="capability-grid">
            <div className="capability-card">
              <h4>🗣️ Natural Language Parsing</h4>
              <p>Understands intent across variations: <em>“Long 5x APT for 100 USDC”</em>, <em>“Open 5x leveraged APT position w/ 100 USDC”</em>.</p>
            </div>
            <div className="capability-card">
              <h4>⚖️ Risk Evaluation</h4>
              <p>Simulates position entry, estimates liquidation, flags over-leverage, and suggests safer collateral ratios.</p>
            </div>
            <div className="capability-card">
              <h4>🔄 Task Automation</h4>
              <p>Schedules stop-loss, take-profit, trailing exits, periodic rebalancing, and conditional orders.</p>
            </div>
            <div className="capability-card">
              <h4>📊 Strategy Evaluation</h4>
              <p>Backtests simple strategies on-chain data (coming soon) and provides projected performance ranges.</p>
            </div>
          </div>
        </div>
  <div className="strategies-section">
          <h3 className="subheading">Strategy Library (Preview)</h3>
          <div className="strategy-grid">
            <div className="strategy-card">
              <h4>Grid Accumulator</h4>
              <p>DCA + range-bound grid execution for sideways markets with configurable band density.</p>
              <div className="tags"><span>Neutral</span><span>Automation</span></div>
            </div>
            <div className="strategy-card">
              <h4>Volatility Breakout</h4>
              <p>Enters momentum trades when APT breaks dynamic ATR bands; auto sets trailing stops.</p>
              <div className="tags"><span>Momentum</span><span>Risk-Control</span></div>
            </div>
            <div className="strategy-card">
              <h4>Mean Reversion</h4>
              <p>Fades extremes using z-score of rolling mid-price; optional partial scaling ladder.</p>
              <div className="tags"><span>Reversion</span><span>Adaptive</span></div>
            </div>
            <div className="strategy-card">
              <h4>Protected Leverage</h4>
              <p>Automated leverage adjustments to maintain target risk threshold as volatility shifts.</p>
              <div className="tags"><span>Leverage</span><span>Dynamic</span></div>
            </div>
          </div>
          <p className="note">More advanced strategies, custom scripting, and backtesting dashboards coming in future releases.</p>
        </div>
      </div>
    </section>
  )
}

function TradingSection({ wallet }) {
  const { isConnected } = wallet

  return (
    <section id="trading" className="section trading-section">
      <div className="section-container">
        <h2>Perpetual Trading Dashboard</h2>
        <p className="section-description">
          CEX-like experience, fully on-chain. Trade spot & margin with AI assistance on Aptos's high-performance blockchain.
        </p>
        <div className="trading-stats">
          <div className="stat-card">
            <h3>$2.4B+</h3>
            <p>Total Volume Traded</p>
          </div>
          <div className="stat-card">
            <h3>150K+</h3>
            <p>AI-Assisted Trades</p>
          </div>
          <div className="stat-card">
            <h3>99.9%</h3>
            <p>Uptime on Aptos</p>
          </div>
        </div>
        <div className="ai-features">
          <div className="ai-feature">
            <h4>🗣️ Natural Language Trading</h4>
            <p>Say "Long 5x APT with 100 USDC" - AI executes immediately</p>
          </div>
          <div className="ai-feature">
            <h4>⚠️ Risk Warnings</h4>
            <p>Real-time alerts for liquidation price and over-leverage protection</p>
          </div>
          <div className="ai-feature">
            <h4>🔄 Portfolio Automation</h4>
            <p>Automated stop-loss, take-profit, and rebalancing strategies</p>
          </div>
        </div>
  <div className="trade-modes">
          <h3 className="subheading">Trading Modes</h3>
          <div className="mode-grid">
            <div className="mode-card">
              <h4>Spot</h4>
              <p>Direct ownership of APT & USDC assets with instant settlement and low slippage routing.</p>
              <ul>
                <li>Simple swaps</li>
                <li>No liquidation risk</li>
                <li>Foundation for strategy collateral</li>
              </ul>
            </div>
            <div className="mode-card">
              <h4>Margin</h4>
              <p>Borrow against collateral to amplify directional exposure with dynamic health monitoring.</p>
              <ul>
                <li>Isolated or cross margin (soon)</li>
                <li>Adaptive interest accrual</li>
                <li>AI risk rebalancing</li>
              </ul>
            </div>
            <div className="mode-card">
              <h4>Perpetual Futures</h4>
              <p>Cash-settled APT/USDC perps with funding rate alignment to spot index pricing.</p>
              <ul>
                <li>Up to 25x planned tiers</li>
                <li>Real-time oracle feed</li>
                <li>Advanced order types (soon)</li>
              </ul>
            </div>
          </div>
          <p className="note">Charts & live APT/USDC pricing to be integrated next.</p>
        </div>
        {!isConnected && (
          <div className="connect-prompt">
            <p>Connect your Aptos wallet to access AI-powered perpetual trading</p>
          </div>
        )}
      </div>
    </section>
  )
}

function PerpTestPanel({ wallet }) {
  const [mark, setMark] = useState(null)
  const [position, setPosition] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({ size: 10, side: 0, lev_bps: 2000, margin: 100 })

  const user = wallet.address
  const pairId = 1

  const loadAll = useCallback(async () => {
    if (!user) return
    setLoading(true); setErr(null)
    try {
      const svc = await import('./services/perpClient.js')
      const mk = await svc.getMark(pairId)
      const pos = await svc.getPosition(user, pairId)
      setMark(mk.markPx)
      setPosition(pos.position)
    } catch (e) { setErr(e.message || 'error') } finally { setLoading(false) }
  }, [user])

  useEffect(()=>{ loadAll() }, [loadAll])

  const open = async () => {
    if (!user) return
    setLoading(true); setErr(null)
    try {
      const svc = await import('./services/perpClient.js')
      await svc.openPosition({ user, pairId, ...form })
      await loadAll()
    } catch(e){ setErr(e.message || 'open failed') } finally { setLoading(false) }
  }
  const close = async () => {
    if (!user || !position) return
    setLoading(true); setErr(null)
    try {
      const svc = await import('./services/perpClient.js')
      await svc.closePosition({ user, pairId, size: form.size })
      await loadAll()
    } catch(e){ setErr(e.message || 'close failed') } finally { setLoading(false) }
  }

  return (
    <div className="side-card" style={{marginTop:'16px'}}>
      <h3>Perp Test</h3>
      {!user && <p style={{fontSize:'12px'}}>Connect wallet to test.</p>}
      {err && <p style={{color:'#ff6b6b', fontSize:'12px'}}>{err}</p>}
      <p style={{fontSize:'12px'}}>Mark: {mark??'–'}</p>
      <p style={{fontSize:'12px'}}>Position: {position? JSON.stringify(position) : 'None'}</p>
      <div style={{display:'flex', flexDirection:'column', gap:4}}>
        <label style={{fontSize:'11px'}}>Size <input type="number" value={form.size} onChange={e=>setForm(f=>({...f,size:Number(e.target.value)}))} style={{width:80}} /></label>
        <label style={{fontSize:'11px'}}>Side
          <select value={form.side} onChange={e=>setForm(f=>({...f,side:Number(e.target.value)}))} style={{marginLeft:6}}>
            <option value={0}>LONG</option><option value={1}>SHORT</option>
          </select>
        </label>
        <label style={{fontSize:'11px'}}>Lev bps <input type="number" value={form.lev_bps} onChange={e=>setForm(f=>({...f,lev_bps:Number(e.target.value)}))} style={{width:80}} /></label>
        <label style={{fontSize:'11px'}}>Margin <input type="number" value={form.margin} onChange={e=>setForm(f=>({...f,margin:Number(e.target.value)}))} style={{width:80}} /></label>
      </div>
      <div style={{display:'flex', gap:8, marginTop:8}}>
        <button disabled={!user||loading} onClick={open} className="suggestion-pill" style={{fontSize:'11px'}}>Open</button>
        <button disabled={!user||loading||!position} onClick={close} className="suggestion-pill" style={{fontSize:'11px'}}>Close</button>
        <button disabled={loading} onClick={loadAll} className="suggestion-pill" style={{fontSize:'11px'}}>Refresh</button>
      </div>
    </div>
  )
}

function ContactSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    // Handle form submission
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <section id="contact" className="section">
      <div className="section-container">
        <h2>Get In Touch</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              type="text" 
              name="name"
              placeholder="Your Name" 
              value={formData.name}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="email" 
              name="email"
              placeholder="Your Email" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="form-group">
            <textarea 
              name="message"
              placeholder="Your Message" 
              value={formData.message}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          <button type="submit" className="btn primary">Send Message</button>
        </form>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <p>&copy; 2025 NEURODEX. All rights reserved. | Aptos-Native Perpetual DEX with AI Integration</p>
    </footer>
  )
}

// Individual Pages
const AiAgentPage = ({ wallet }) => {
  return (
    <div className="page section-container ai-agent-page ai-agent-centered">
      <div className="ai-header-block solo">
        <h1 className="subheading big-heading center">AI Agent Console</h1>
        <p className="hero-subtitle center">Conversational blockchain assistant + Perp test hooks.</p>
      </div>
      <ChatInterface layout="center" wallet={wallet} />
      <PerpTestPanel wallet={wallet} />
  <ContractExplorer wallet={wallet} />
    </div>
  )
}

// Crypto Strategies Components
function CryptoStrategiesSection() {
  const strategies = [
    {
      name: "🎯 Basis Trading",
      category: "Arbitrage",
      risk: "Low",
      timeframe: "1-7 days",
      description: "Capture price differences between spot and futures markets",
      details: "Simultaneously buy spot crypto and sell futures (or vice versa) to profit from basis convergence. When futures trade at a premium to spot, sell futures and buy spot. At expiration, the basis converges to zero, locking in the premium as profit.",
      pros: ["Market neutral", "Predictable returns", "Low correlation to crypto direction"],
      cons: ["Capital intensive", "Margin requirements", "Basis risk"],
      example: "BTC spot: $65,000, BTC 3-month futures: $66,300 → Sell futures, buy spot, capture $1,300 premium"
    },
    {
      name: "⚡ Funding Rate Arbitrage", 
      category: "Arbitrage",
      risk: "Medium",
      timeframe: "8 hours",
      description: "Profit from perpetual swap funding rate payments",
      details: "When funding rates are extremely positive, short perpetuals and hedge with spot or options. Collect funding payments every 8 hours while maintaining market neutral position. Most effective during high volatility periods.",
      pros: ["Regular income stream", "Market neutral", "High frequency opportunities"],
      cons: ["Position management complexity", "Exchange risk", "Funding can reverse quickly"],
      example: "ETH perp funding: +0.5% (150% APR) → Short perps, buy spot, collect funding payments"
    },
    {
      name: "🌊 Volatility Trading",
      category: "Options",
      risk: "High", 
      timeframe: "1-30 days",
      description: "Trade implied vs realized volatility using options",
      details: "Buy options when implied volatility is low relative to expected realized volatility, or sell when IV is high. Use straddles, strangles, or variance swaps. Most profitable around major events or during volatility regime changes.",
      pros: ["High profit potential", "Non-directional", "Leveraged exposure"],
      cons: ["Time decay", "Complex Greeks", "Requires volatility forecasting"],
      example: "BTC implied vol: 45%, realized vol: 65% → Buy ATM straddle, profit from vol expansion"
    },
    {
      name: "📈 Momentum Futures",
      category: "Directional", 
      risk: "High",
      timeframe: "1-14 days",
      description: "Ride crypto trends using leveraged futures positions",
      details: "Identify strong momentum in major cryptos using technical indicators (RSI, MACD, breakouts). Enter futures positions with 3-10x leverage, use trailing stops, and pyramid into winning positions. Works best during clear trending markets.",
      pros: ["High leverage", "Clear entry/exit signals", "Trend following"],
      cons: ["High volatility", "Whipsaw risk", "Leverage amplifies losses"],
      example: "BTC breaks $70K resistance with volume → Long BTC futures 5x, trail stop at 8% below high"
    }
  ];

  return (
    <section className="strategies-section">
      <h2>💰 Core Crypto Derivatives Strategies</h2>
      <div className="strategies-grid">
        {strategies.map((strategy, index) => (
          <StrategyCard key={index} strategy={strategy} />
        ))}
      </div>
    </section>
  );
}

function FuturesStrategiesSection() {
  const futuresStrategies = [
    {
      name: "🔄 Calendar Spreads",
      category: "Spread Trading",
      risk: "Medium",
      timeframe: "1-3 months", 
      description: "Trade time decay differences between futures expiries",
      details: "Buy longer-dated futures and sell shorter-dated futures (or vice versa) to profit from differential time decay and volatility changes. Most effective when contango/backwardation patterns are expected to change.",
      pros: ["Lower margin requirements", "Reduced directional risk", "Time decay benefits"],
      cons: ["Limited profit potential", "Complex analysis", "Liquidity constraints"],
      example: "Buy BTC March futures, sell BTC January futures → Profit from contango steepening"
    },
    {
      name: "⚖️ Inter-Exchange Arbitrage",
      category: "Arbitrage",
      risk: "Medium",
      timeframe: "Minutes-Hours",
      description: "Exploit price differences across exchanges",
      details: "Simultaneously buy on cheaper exchange and sell on expensive exchange. Account for withdrawal fees, transfer times, and counterparty risk. Most profitable during high volatility or low liquidity periods.",
      pros: ["Market neutral", "Quick profits", "Multiple opportunities"],
      cons: ["Exchange risk", "Transfer delays", "Fee erosion"],
      example: "BTC Binance: $65,000, BTC Coinbase: $65,200 → Buy Binance, sell Coinbase"
    },
    {
      name: "📊 Statistical Arbitrage",
      category: "Quantitative",
      risk: "Medium",
      timeframe: "1-7 days",
      description: "Trade mean reversion in crypto pairs using statistical models",
      details: "Identify historically correlated crypto pairs (ETH/BTC, SOL/ETH) and trade deviations from statistical norms. Use z-scores, cointegration, and pair ratios to signal entries and exits.",
      pros: ["Statistical edge", "Market neutral", "Scalable strategy"],
      cons: ["Model risk", "Regime changes", "Correlation breakdown"],
      example: "ETH/BTC ratio 2 std devs below mean → Long ETH futures, short BTC futures"
    },
    {
      name: "🎪 Volatility Surface Trading",
      category: "Advanced Options",
      risk: "High",
      timeframe: "1-7 days",
      description: "Trade options across different strikes and expiries",
      details: "Analyze the entire volatility surface to find mispriced options. Trade volatility skew, term structure, and relative value between strikes. Requires sophisticated options pricing models and Greeks management.",
      pros: ["Multiple profit sources", "Portfolio approach", "Advanced edge"],
      cons: ["Very complex", "High capital requirements", "Model dependent"],
      example: "BTC 25-delta put vol > 75-delta put vol → Sell vol skew, buy protection"
    }
  ];

  return (
    <section className="strategies-section">
      <h2>⚡ Advanced Futures & Options Strategies</h2>
      <div className="strategies-grid">
        {futuresStrategies.map((strategy, index) => (
          <StrategyCard key={index} strategy={strategy} />
        ))}
      </div>
    </section>
  );
}

function RiskManagementSection() {
  return (
    <section className="strategies-section">
      <h2>🛡️ Risk Management Framework</h2>
      <div className="risk-management-grid">
        <div className="risk-card">
          <h3>📏 Position Sizing</h3>
          <ul>
            <li><strong>Kelly Criterion:</strong> Optimal position size based on edge and odds</li>
            <li><strong>Fixed Fractional:</strong> Risk 1-2% of portfolio per trade</li>
            <li><strong>Volatility Scaling:</strong> Adjust size based on asset volatility</li>
            <li><strong>Correlation Limits:</strong> Maximum exposure to correlated positions</li>
          </ul>
        </div>
        <div className="risk-card">
          <h3>⏱️ Time-Based Risk</h3>
          <ul>
            <li><strong>Theta Decay:</strong> Monitor options time decay daily</li>
            <li><strong>Funding Costs:</strong> Track perpetual funding rates</li>
            <li><strong>Expiry Management:</strong> Roll or close positions before expiry</li>
            <li><strong>Weekend Risk:</strong> Reduce exposure during market closures</li>
          </ul>
        </div>
        <div className="risk-card">
          <h3>💥 Tail Risk Hedging</h3>
          <ul>
            <li><strong>VIX Options:</strong> Buy crypto volatility protection</li>
            <li><strong>Put Spreads:</strong> Defined risk downside protection</li>
            <li><strong>Safe Haven Assets:</strong> Gold, USD exposure during crashes</li>
            <li><strong>Circuit Breakers:</strong> Auto-liquidate at -X% portfolio loss</li>
          </ul>
        </div>
        <div className="risk-card">
          <h3>🔍 Real-Time Monitoring</h3>
          <ul>
            <li><strong>Greeks Tracking:</strong> Delta, gamma, vega, theta exposure</li>
            <li><strong>VAR Analysis:</strong> Value at Risk calculations</li>
            <li><strong>Stress Testing:</strong> Portfolio performance under extreme moves</li>
            <li><strong>Margin Monitoring:</strong> Real-time margin usage and requirements</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function DerivativesEducationSection() {
  return (
    <section className="strategies-section">
      <h2>📚 Derivatives Trading Masterclass</h2>
      <div className="education-grid">
        <div className="education-card">
          <h3>🎯 Futures Fundamentals</h3>
          <div className="education-content">
            <p><strong>What are Crypto Futures?</strong></p>
            <p>Standardized contracts to buy/sell crypto at predetermined price and date. Unlike spot trading, futures offer:</p>
            <ul>
              <li>📈 <strong>Leverage:</strong> Control large positions with small capital</li>
              <li>🔒 <strong>Hedging:</strong> Protect existing positions from adverse moves</li>
              <li>💰 <strong>Short Selling:</strong> Profit from falling prices</li>
              <li>⏰ <strong>Price Discovery:</strong> Forward-looking price expectations</li>
            </ul>
            <p><strong>Key Concepts:</strong></p>
            <ul>
              <li><strong>Contango:</strong> Futures {'>'} Spot (normal market)</li>
              <li><strong>Backwardation:</strong> Futures {'<'} Spot (stressed market)</li>
              <li><strong>Basis:</strong> Futures - Spot price difference</li>
              <li><strong>Roll Yield:</strong> Profit/loss from rolling positions</li>
            </ul>
          </div>
        </div>
        
        <div className="education-card">
          <h3>⚡ Perpetual Swaps Deep Dive</h3>
          <div className="education-content">
            <p><strong>The Innovation of Crypto Perpetuals</strong></p>
            <p>Perpetual swaps revolutionized crypto trading by eliminating expiry dates:</p>
            <ul>
              <li>🔄 <strong>No Expiry:</strong> Hold positions indefinitely</li>
              <li>💸 <strong>Funding Mechanism:</strong> Keeps price near spot</li>
              <li>📊 <strong>High Liquidity:</strong> Most traded crypto derivatives</li>
              <li>🎯 <strong>Tight Spreads:</strong> Efficient price discovery</li>
            </ul>
            <p><strong>Funding Rate Mechanics:</strong></p>
            <ul>
              <li><strong>Positive Rate:</strong> Longs pay shorts (bullish sentiment)</li>
              <li><strong>Negative Rate:</strong> Shorts pay longs (bearish sentiment)</li>
              <li><strong>Payment Frequency:</strong> Every 8 hours on most exchanges</li>
              <li><strong>Rate Calculation:</strong> Premium + Interest Rate</li>
            </ul>
          </div>
        </div>

        <div className="education-card">
          <h3>🎪 Options Strategies Explained</h3>
          <div className="education-content">
            <p><strong>Crypto Options: Advanced Risk Management</strong></p>
            <p>Options provide asymmetric payoffs and sophisticated strategies:</p>
            <ul>
              <li>📈 <strong>Calls:</strong> Right to buy, bullish exposure</li>
              <li>📉 <strong>Puts:</strong> Right to sell, bearish exposure</li>
              <li>🔀 <strong>Straddles:</strong> Profit from volatility moves</li>
              <li>🎯 <strong>Iron Condors:</strong> Profit from sideways movement</li>
            </ul>
            <p><strong>The Greeks - Risk Sensitivities:</strong></p>
            <ul>
              <li><strong>Delta (Δ):</strong> Price sensitivity to underlying moves</li>
              <li><strong>Gamma (Γ):</strong> Delta's rate of change</li>
              <li><strong>Theta (Θ):</strong> Time decay impact</li>
              <li><strong>Vega (ν):</strong> Implied volatility sensitivity</li>
            </ul>
          </div>
        </div>

        <div className="education-card">
          <h3>⚡ AI-Powered Execution</h3>
          <div className="education-content">
            <p><strong>Next-Gen Trading with NeuroDEX AI</strong></p>
            <p>Our AI agent enhances derivatives trading through:</p>
            <ul>
              <li>🧠 <strong>Strategy Optimization:</strong> Real-time parameter tuning</li>
              <li>📊 <strong>Risk Assessment:</strong> Continuous portfolio analysis</li>
              <li>⚡ <strong>Execution Speed:</strong> Millisecond order placement</li>
              <li>🎯 <strong>Opportunity Detection:</strong> 24/7 market scanning</li>
            </ul>
            <p><strong>Natural Language Commands:</strong></p>
            <ul>
              <li>"Set up BTC basis trade with 3-month futures"</li>
              <li>"Monitor ETH funding rates, alert if {'>'} 0.3%"</li>
              <li>"Execute volatility trade on SOL earnings"</li>
              <li>"Hedge my portfolio with 10% downside protection"</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function StrategyCard({ strategy }) {
  const [expanded, setExpanded] = useState(false);
  
  const getRiskColor = (risk) => {
    switch(risk) {
      case 'Low': return '#22c55e';
      case 'Medium': return '#f59e0b'; 
      case 'High': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="strategy-card">
      <div className="strategy-header">
        <h3>{strategy.name}</h3>
        <div className="strategy-badges">
          <span className="category-badge">{strategy.category}</span>
          <span className="risk-badge" style={{backgroundColor: getRiskColor(strategy.risk)}}>
            {strategy.risk} Risk
          </span>
        </div>
      </div>
      
      <div className="strategy-meta">
        <div className="meta-item">
          <span className="meta-label">⏱️ Timeframe:</span>
          <span className="meta-value">{strategy.timeframe}</span>
        </div>
      </div>

      <p className="strategy-description">{strategy.description}</p>

      <button 
        className="expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '📖 Show Less' : '📈 Learn Strategy'}
      </button>

      {expanded && (
        <div className="strategy-details">
          <div className="details-section">
            <h4>🎯 Strategy Explanation</h4>
            <p>{strategy.details}</p>
          </div>
          
          <div className="pros-cons">
            <div className="pros">
              <h4>✅ Advantages</h4>
              <ul>
                {strategy.pros.map((pro, i) => <li key={i}>{pro}</li>)}
              </ul>
            </div>
            <div className="cons">
              <h4>⚠️ Risks</h4>
              <ul>
                {strategy.cons.map((con, i) => <li key={i}>{con}</li>)}
              </ul>
            </div>
          </div>
          
          <div className="example-section">
            <h4>💡 Example Trade</h4>
            <div className="example-box">
              {strategy.example}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StrategiesPage = () => (
  <div className="page section-container">
    <div className="strategies-hero">
      <h1 className="subheading">🚀 Crypto Derivatives & Futures Strategies</h1>
      <p className="hero-subtitle" style={{textAlign:'left'}}>
        Professional trading strategies for crypto derivatives, futures, and perpetuals. 
        AI-powered execution with real-world market data integration.
      </p>
    </div>
    
    <CryptoStrategiesSection />
    <FuturesStrategiesSection />
    <RiskManagementSection />
    <DerivativesEducationSection />
  </div>
)

const DexPage = () => (
  <div className="page section-container">
    <h1 className="subheading">Decentralized Exchange (DEX)</h1>
    <p className="hero-subtitle" style={{textAlign:'left'}}>
      Unified liquidity, intelligent routing, and AI-assisted execution. This module will aggregate Aptos DEX pools, provide best-route quoting,
      slippage prediction, gas & MEV mitigation (planned), and AI natural language swap commands.
    </p>
    <div className="about-grid" style={{marginTop:'40px'}}>
      <div className="feature-card">
        <div className="card-icon">🔀</div>
        <h3>Smart Routing</h3>
        <p>Splits orders across pools for best effective price & minimal slippage using simulated path scoring.</p>
      </div>
      <div className="feature-card">
        <div className="card-icon">🧪</div>
        <h3>Quote Simulation</h3>
        <p>Pre-trade slippage & fee impact estimates help size orders safely before you sign.</p>
      </div>
      <div className="feature-card">
        <div className="card-icon">🧠</div>
        <h3>AI Swap Commands</h3>
        <p>Type: "Swap 250 USDC to APT with max 0.5% slippage" – intent parsing builds the optimal transaction.</p>
      </div>
      <div className="feature-card">
        <div className="card-icon">🛡️</div>
        <h3>Protection Layer</h3>
        <p>Planned: frontrun resistance, auto slippage re-adjustment, and fail-safe tx splitting on volatility spikes.</p>
      </div>
    </div>
    <p className="note" style={{marginTop:'32px'}}>Live swap executor & pool indexer integration coming in next milestone.</p>
  </div>
)

const SpotPage = () => {
  return <SpotTrading />
}

function SpotTrading() {
  const [pair, setPair] = useState('APTUSDT')
  const [leverage, setLeverage] = useState(5)
  const [marginMode, setMarginMode] = useState('cross') // cross | isolated
  const [scriptReady, setScriptReady] = useState(false)
  const [tvError, setTvError] = useState(null)
  const containerRef = useRef(null)
  const widgetRef = useRef(null)
  const [activeTab, setActiveTab] = useState('trade') // trade | orderbook
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [], mid: 0 })

  // Simulated order book generator
  useEffect(() => {
    let mid = 12.5 // placeholder mid price
    const gen = () => {
      // Slight random walk mid
      mid = mid * (1 + (Math.random() - 0.5) * 0.001)
      const precision = 3
      const levels = 14
      const spread = mid * 0.0015
      const asks = []
      const bids = []
      for (let i = levels; i > 0; i--) {
        const price = mid + spread + i * 0.0008 * mid
        asks.push({ price: Number(price.toFixed(precision)), size: +(Math.random() * 180 + 20).toFixed(2) })
      }
      for (let i = 0; i < levels; i++) {
        const price = mid - spread - i * 0.0008 * mid
        bids.push({ price: Number(price.toFixed(precision)), size: +(Math.random() * 180 + 20).toFixed(2) })
      }
      setOrderBook({ bids, asks, mid })
    }
    gen()
    const id = setInterval(gen, 1200)
    return () => clearInterval(id)
  }, [pair])

  // Load TradingView script once
  useEffect(() => {
    if (window.TradingView) { setScriptReady(true); return }
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => { setScriptReady(true); setTvError(null) }
    script.onerror = () => setTvError('Failed to load TradingView library (network/CSP).')
    document.head.appendChild(script)
    const timeoutId = setTimeout(() => {
      if (!window.TradingView) {
        setTvError('Chart library taking long to load. Check network or disable blockers.')
      }
    }, 8000)
    return () => { /* don't remove to allow caching */ }
  }, [])

  // Instantiate / recreate widget when pair changes
  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.TradingView) return
    // Clear previous
    containerRef.current.innerHTML = ''
    const symbolMap = {
      APTUSDT: 'BINANCE:APTUSDT',
      APTUSDC: 'BINANCE:APTUSDC'
    }
    try {
      widgetRef.current = new window.TradingView.widget({
        symbol: symbolMap[pair] || 'BINANCE:APTUSDT',
        interval: '15',
        container_id: containerRef.current.id,
        autosize: true,
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_legend: false,
        allow_symbol_change: true,
        studies: ['MASimple@tv-basicstudies'],
        custom_css_url: '',
        timezone: 'Etc/UTC',
      })
    } catch (e) {
      console.warn('TradingView widget error', e)
      setTvError('Widget initialization failed.')
    }
  }, [pair, scriptReady])

  return (
    <div className="page section-container spot-page">
      <h1 className="subheading">Spot Trading</h1>
      <p className="hero-subtitle" style={{textAlign:'left'}}>Live charting (TradingView) & simulated leverage controls. Execution coming soon.</p>
      <div className="spot-layout">
        <div className="chart-panel-outer">
          <div className="pair-switcher">
            {['APTUSDT','APTUSDC'].map(p => (
              <button key={p} className={`pair-btn ${p===pair?'active':''}`} onClick={() => setPair(p)}>{p.replace('APT','APT/')}</button>
            ))}
          </div>
          <div className="tv-wrap">
            <div id="tv-spot-chart" ref={containerRef} className="tv-chart-container"></div>
            {!scriptReady && !tvError && <div className="chart-loading">Loading chart...</div>}
            {tvError && (
              <div className="chart-loading" style={{flexDirection:'column', gap:'8px', textAlign:'center'}}>
                <strong style={{color:'var(--accent-color)'}}>Chart Unavailable</strong>
                <span style={{fontSize:'.65rem', lineHeight:'1.4'}}>{tvError}</span>
                <button style={{marginTop:'6px'}} className="pair-btn" onClick={()=>window.location.reload()}>Retry</button>
              </div>
            )}
          </div>
        </div>
        <div className="spot-right-panel">
          <div className="right-tabs">
            <button className={activeTab==='trade'?'active':''} onClick={()=>setActiveTab('trade')}>Trade</button>
            <button className={activeTab==='orderbook'?'active':''} onClick={()=>setActiveTab('orderbook')}>Order Book</button>
          </div>
          <div className="right-tab-body">
            {activeTab==='trade' && (
              <div className="trade-controls">
                <div className="control-card">
                  <h3>Margin Mode</h3>
                  <div className="mode-toggle">
                    <button onClick={()=>setMarginMode('cross')} className={marginMode==='cross'?'active':''}>Cross</button>
                    <button onClick={()=>setMarginMode('isolated')} className={marginMode==='isolated'?'active':''}>Isolated</button>
                  </div>
                  <p className="mini-note">Simulated selection – risk engine integration pending.</p>
                </div>
                <div className="control-card">
                  <h3>Leverage <span>{leverage}x</span></h3>
                  <input type="range" min="1" max="50" value={leverage} onChange={e=>setLeverage(Number(e.target.value))} />
                  <div className="leverage-scale">
                    <span>1x</span><span>10x</span><span>25x</span><span>50x</span>
                  </div>
                </div>
                <OrderForm pair={pair} leverage={leverage} marginMode={marginMode} />
                <div className="control-card disclaimer">
                  <strong>Disclaimer:</strong> Chart via TradingView widget. Order submission & on-chain integration not yet live.
                </div>
              </div>
            )}
            {activeTab==='orderbook' && (
              <OrderBook book={orderBook} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderForm({ pair, leverage, marginMode }) {
  const [side, setSide] = useState('buy')
  const [amount, setAmount] = useState('')
  const notReady = true
  return (
    <div className="control-card order-card">
      <h3>Place Order</h3>
      <div className="side-toggle">
        <button className={side==='buy'? 'buy active':'buy'} onClick={()=>setSide('buy')}>Buy</button>
        <button className={side==='sell'? 'sell active':'sell'} onClick={()=>setSide('sell')}>Sell</button>
      </div>
      <label className="field">
        <span>Amount (APT)</span>
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.0" />
      </label>
      <div className="order-summary">
        <p>Pair: <strong>{pair.replace('APT','APT/')}</strong></p>
        <p>Leverage: <strong>{leverage}x</strong></p>
        <p>Mode: <strong>{marginMode}</strong></p>
      </div>
      <button className="submit-order" disabled={notReady || !amount.trim()}>{side==='buy'?'Buy':'Sell'} (Disabled)</button>
    </div>
  )
}

function OrderBook({ book }) {
  const { bids, asks, mid } = book
  const maxSize = Math.max(...bids.map(b=>b.size), ...asks.map(a=>a.size), 1)
  return (
    <div className="control-card orderbook-card">
      <h3>Order Book <span style={{fontSize:'0.65rem', color:'var(--text-muted)'}}>~{mid.toFixed(3)} USDC</span></h3>
      <div className="ob-grid">
        <div className="ob-header">
          <span>Price</span><span>Size</span><span>Cumulative</span>
        </div>
        <div className="ob-section asks">
          {asks.map((a,i)=>{
            const cumulative = asks.slice(0,i+1).reduce((s,x)=>s+x.size,0)
            return (
              <div key={'a'+i} className="ob-row ask">
                <div className="bar" style={{width:`${(a.size/maxSize)*100}%`}}></div>
                <span className="price">{a.price}</span>
                <span className="size">{a.size}</span>
                <span className="cum">{cumulative.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
        <div className="ob-mid">Spread</div>
        <div className="ob-section bids">
          {bids.map((b,i)=>{
            const cumulative = bids.slice(0,i+1).reduce((s,x)=>s+x.size,0)
            return (
              <div key={'b'+i} className="ob-row bid">
                <div className="bar" style={{width:`${(b.size/maxSize)*100}%`}}></div>
                <span className="price">{b.price}</span>
                <span className="size">{b.size}</span>
                <span className="cum">{cumulative.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
const MarginPage = () => (
  <div className="page section-container">
    <h1 className="subheading">Margin Trading</h1>
    <p className="hero-subtitle" style={{textAlign:'left'}}>Leverage with intelligent health & liquidation projections powered by the AI agent.</p>
  </div>
)
const PerpPage = () => (
  <div className="page section-container">
    <h1 className="subheading">Perpetual Futures</h1>
    <p className="hero-subtitle" style={{textAlign:'left'}}>APT/USDC perps with funding guidance & upcoming real-time charts.</p>
  </div>
)

// Enhanced Chat Message Component
function ChatMessage({ role, content, type, className, data }) {
  const getMessageIcon = () => {
    if (role === 'user') return '🧑';
    
    switch (type) {
      case 'transaction_success': return '✅';
      case 'transaction_error': return '❌'; 
      case 'wallet_required': return '🔐';
      case 'balance_info': return '💰';
      case 'loading': return '⚡';
      default: return '🤖';
    }
  };

  const getBubbleClass = () => {
    let baseClass = 'bubble';
    if (className) {
      baseClass += ` ${className}`;
    }
    if (role === 'user') {
      baseClass += ' user-bubble';
    }
    return baseClass;
  };

  // Ensure content is a string
  const safeContent = typeof content === 'string' ? content : 
                      content && typeof content === 'object' ? JSON.stringify(content, null, 2) :
                      String(content || 'No content received');

  return (
    <div className={`chat-msg ${role === 'user' ? 'user' : ''} ${type ? `msg-${type}` : ''}`}>
      <div className="avatar">{getMessageIcon()}</div>
      <div className={getBubbleClass()}>
        {safeContent.split('\n').map((line, i) => line ? <p key={i}>{line}</p> : <p key={i}>&nbsp;</p>)}
        
        {type === 'transaction_success' && data && (
          <div className="transaction-details">
            <div className="detail-row">
              <span>Amount:</span> <strong>{data.amount} APT</strong>
            </div>
            <div className="detail-row">
              <span>Recipient:</span> <code>{data.recipient.slice(0, 20)}...</code>
            </div>
            {data.hash && (
              <div className="detail-row">
                <span>Hash:</span> <code>{data.hash.slice(0, 20)}...</code>
              </div>
            )}
          </div>
        )}
        
        {type === 'balance_info' && data && (
          <div className="balance-details">
            <div className="balance-amount">{data.formattedBalance}</div>
            <div className="balance-raw">Raw: {data.balance} octas</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatInterface({ layout = 'split', wallet = null }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'agent', content: 'Hi! I\'m NeuroDex AI with advanced transaction capabilities. You can now execute transactions by simply typing commands!\n\n🚀 Try these commands:\n• "send 1.0 APT to 0x123..."\n• "check my balance"\n• "connect wallet"\n• "initiate transaction to [address]"\n\nI can help with blockchain questions AND execute real transactions!' },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef(null)
  const [suggestions] = useState([
    'send 1.0 APT to 0x123...',
    'check my balance',
    'What is DeFi?',
    'connect wallet',
    'How do funding rates work?',
    'initiate transaction'
  ])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return
    const userPrompt = input.trim()
    const userMsg = { id: Date.now(), role: 'user', content: userPrompt }
    setMessages(m => [...m, userMsg])
    setInput('')
    setIsStreaming(true)
    const agentId = Date.now() + 1
    setMessages(m => [...m, { id: agentId, role: 'agent', content: '', type: 'loading' }])
    
    try {
      console.log('💬 ChatInterface sending message:', userPrompt);
      console.log('💬 Wallet object:', wallet);
      console.log('💬 Wallet address:', wallet?.address);
      
      // Use enhanced AI transaction agent
      const aiAgent = await import('./services/aiTransactionAgent.js')
      const walletAddress = wallet?.address || null
      
      const result = await aiAgent.default.processCommand(userPrompt, walletAddress)
      
      let finalMessage = result.message;
      let messageClass = '';
      
      // Add styling based on result type
      switch (result.type) {
        case 'transaction_success':
          messageClass = 'success-message';
          break;
        case 'transaction_error':
        case 'execution_error':
          messageClass = 'error-message';
          break;
        case 'wallet_required':
          messageClass = 'wallet-required-message';
          break;
        case 'balance_info':
          messageClass = 'balance-message';
          break;
        default:
          messageClass = 'ai-message';
      }
      
      setMessages(m => m.map(msg => 
        msg.id === agentId 
          ? { ...msg, content: finalMessage, type: result.type, className: messageClass, data: result.data } 
          : msg
      ))
      
    } catch (e) {
      console.warn('AI Transaction Agent failed', e)
      setMessages(m => m.map(msg => 
        msg.id === agentId 
          ? { ...msg, content: `🤖 AI Agent Error: ${e.message}\n\nFalling back to basic responses. Please try again or check your connection.`, className: 'error-message' } 
          : msg
      ))
    } finally {
      setIsStreaming(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const centerMode = layout === 'center'
  // auto-scroll on new messages or streaming updates
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isStreaming])
  return (
    <div className={`chat-shell ${centerMode ? 'fullscreen-centered' : ''}`}>
      <div className={`chat-panel gradient-border ${centerMode ? 'wide' : ''}`}>
        <div className="chat-scroll" id="chat-scroll" ref={scrollRef}>
          {messages.map(m => (
            <ChatMessage 
              key={m.id} 
              role={m.role} 
              content={m.content} 
              type={m.type}
              className={m.className}
              data={m.data}
            />
          ))}
          {isStreaming && <div className="typing-indicator"><span></span><span></span><span></span></div>}
        </div>
        <div className="suggestion-row">
          {suggestions.map(s => (
            <button key={s} className="suggestion-pill" onClick={() => setInput(s)}>{s}</button>
          ))}
        </div>
        <div className="input-row">
          <textarea
            className="chat-input"
            placeholder="Try: 'send 1.0 APT to 0x123...' or 'check my balance' or ask about DeFi..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button className="send-btn" onClick={sendMessage} disabled={isStreaming || !input.trim()}>
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
        <div className="chat-footer-info">
          <span className="status-dot online"></span> Powered by NeuroDex AI
        </div>
      </div>
      {!centerMode && (
        <div className="chat-side">
          <div className="side-card">
            <h3>AI Assistant</h3>
            <ul>
              <li>Blockchain & DeFi education</li>
              <li>Trading concepts & risk analysis</li>
              <li>Cryptocurrency explanations</li>
              <li>Smart contract interactions</li>
            </ul>
          </div>
          <div className="side-card">
            <h3>Ask About</h3>
            <p>Liquidity pools, yield farming, staking, lending protocols, DEX trading, leverage, liquidation risks, tokenomics, and more.</p>
          </div>
          <div className="side-card roadmap">
            <h3>Coming Soon</h3>
            <ul>
              <li>Real-time market analysis</li>
              <li>Portfolio optimization</li>
              <li>Transaction execution</li>
              <li>Custom strategy building</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

async function* generateAgentReply(prompt) {
  // Deprecated: offline fallback removed per requirement (AI responses must come from backend only).
  yield 'AI backend unavailable. No response generated.'
}

function describeIntent(text) {
  const t = text.toLowerCase()
  if (t.includes('long')) return 'Detected LONG perpetual intent on APT/USDC with leverage inference. '
  if (t.includes('short')) return 'Detected SHORT positioning request. '
  if (t.includes('liquidation')) return 'Retrieving current estimated liquidation thresholds for open positions. '
  if (t.includes('rebalance')) return 'Portfolio rebalance simulation across APT/USDC with target ratio alignment. '
  if (t.includes('stop') || t.includes('take')) return 'Order management instruction identified (protective / exit layers). '
  return 'General inquiry classified; providing structured response. '
}


function App() {
  const wallet = usePetraWallet()
  return (
    <BrowserRouter>
      <div className="app">
        <div className="background-effects"></div>
        <Header wallet={wallet} />
        <Routes>
          <Route path="/" element={<>
            <HeroSection wallet={wallet} />
            <AboutSection />
            <TradingSection wallet={wallet} />
            <ContactSection />
          </>} />
          <Route path="/features/ai-agent" element={<AiAgentPage wallet={wallet} />} />
            <Route path="/features/strategies" element={<StrategiesPage />} />
          <Route path="/features/dex" element={<DexPage />} />
          <Route path="/trading/spot" element={<SpotPage />} />
          <Route path="/trading/margin" element={<MarginPage />} />
          <Route path="/trading/perpetuals" element={<PerpPage />} />
          <Route path="/contact" element={<ContactSection />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
