// TradingDashboard.jsx - Main trading dashboard combining all features
import React, { useState } from 'react';
import WalletConnector from './WalletConnector';
import VaultInterface from './VaultInterface';
import AITradingInterface from './AITradingInterface';
import useWallet from '../hooks/useWallet';
import useOrderBook from '../hooks/useOrderBook';
import usePerpetuals from '../hooks/usePerpetuals';
import useLiquidation from '../hooks/useLiquidation';

const TradingDashboard = () => {
  const { connected, address } = useWallet();
  const { orderBook, getBestPrices } = useOrderBook();
  const { userPositions, markPrices } = usePerpetuals();
  const { userHealthFactor, getLiquidationRisk } = useLiquidation();
  
  const [activeTab, setActiveTab] = useState('overview');

  const bestPrices = getBestPrices();
  const healthRisk = getLiquidationRisk(userHealthFactor);

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'vault', name: 'Vault' },
    { id: 'trading', name: 'Spot Trading' },
    { id: 'perpetuals', name: 'Perpetuals' },
    { id: 'ai', name: 'AI Trading' },
  ];

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      case 'liquidatable': return 'text-red-800 font-bold';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">NeuroDex</h1>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Testnet
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {connected && userHealthFactor && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Health:</span>
                  <span className={`text-sm font-medium ${getRiskColor(healthRisk)}`}>
                    {userHealthFactor.toFixed(2)} ({healthRisk})
                  </span>
                </div>
              )}
              <WalletConnector />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Overview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Market Prices */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Prices</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(markPrices).map(([market, price]) => (
                      <div key={market} className="text-center">
                        <p className="text-sm text-gray-600">{market}</p>
                        <p className="text-lg font-semibold">${price?.toFixed(4) || '0.0000'}</p>
                      </div>
                    ))}
                    {bestPrices.midPrice > 0 && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600">APT/USDC Spot</p>
                        <p className="text-lg font-semibold">${bestPrices.midPrice.toFixed(4)}</p>
                        <p className="text-xs text-gray-500">
                          Spread: ${bestPrices.spread.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Positions */}
                {userPositions.length > 0 && (
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Positions</h3>
                    <div className="space-y-3">
                      {userPositions.slice(0, 5).map((position) => (
                        <div key={position.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              position.side === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {position.side.toUpperCase()}
                            </span>
                            <span className="font-medium">{position.market}</span>
                            <span className="text-sm text-gray-600">
                              {position.size.toFixed(4)} @ {position.entryPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)} USDC
                            </p>
                            <p className="text-xs text-gray-500">{position.leverage.toFixed(1)}x</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connected</span>
                      <span className={connected ? 'text-green-600' : 'text-red-600'}>
                        {connected ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {connected && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Address</span>
                          <span className="text-sm font-mono">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Positions</span>
                          <span>{userPositions.length}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* OrderBook Preview */}
                {(orderBook.bids.length > 0 || orderBook.asks.length > 0) && (
                  <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Book (APT/USDC)</h3>
                    <div className="space-y-2 text-sm">
                      <div className="text-red-600 font-medium">Asks</div>
                      {orderBook.asks.slice(0, 3).map((ask, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{ask.price.toFixed(4)}</span>
                          <span>{ask.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 text-green-600 font-medium">Bids</div>
                      {orderBook.bids.slice(0, 3).map((bid, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{bid.price.toFixed(4)}</span>
                          <span>{bid.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vault' && <VaultInterface />}
          
          {activeTab === 'ai' && <AITradingInterface />}

          {/* Placeholder for other tabs */}
          {(activeTab === 'trading' || activeTab === 'perpetuals') && (
            <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {activeTab === 'trading' ? 'Spot Trading' : 'Perpetuals Trading'}
              </h3>
              <p className="text-gray-600">
                This section is coming soon. Use the AI Trading tab to interact with these features through natural language.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingDashboard;
