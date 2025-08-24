// Wallet Integration Component - Shows balance via smart contract
import React, { useState, useEffect } from 'react';
import { useSmartWallet } from '../hooks/useSmartWallet';
import './WalletIntegration.css';

const WalletIntegration = () => {
  const { wallet, connectWallet, disconnectWallet, refreshBalance } = useSmartWallet();
  const [transferData, setTransferData] = useState({
    recipient: '',
    amount: ''
  });
  const [transferResult, setTransferResult] = useState(null);

  const handleConnect = async () => {
    const result = await connectWallet();
    if (!result.success) {
      alert('Failed to connect wallet: ' + result.error);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setTransferResult(null);
  };

  const handleTransfer = async () => {
    if (!transferData.recipient || !transferData.amount) {
      alert('Please enter recipient address and amount');
      return;
    }

    const result = await wallet.transferApt(transferData.recipient, parseFloat(transferData.amount));
    setTransferResult(result);
    
    if (result.success) {
      setTransferData({ recipient: '', amount: '' });
    }
  };

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      alert('Address copied to clipboard!');
    }
  };

  return (
    <div className="wallet-integration">
      <div className="wallet-header">
        <h2>🏦 Smart Wallet Integration</h2>
        <p>Connect your Petra wallet to view balance through our Aptos smart contract</p>
      </div>

      {!wallet.connected ? (
        <div className="connect-section">
          <div className="wallet-info">
            <h3>Connect Wallet</h3>
            <p>Please install and connect your Petra wallet to continue</p>
            {wallet.error && (
              <div className="error-message">
                ❌ {wallet.error}
              </div>
            )}
          </div>
          
          <button 
            className="connect-btn"
            onClick={handleConnect}
            disabled={wallet.loading}
          >
            {wallet.loading ? '🔄 Connecting...' : '🔗 Connect Petra Wallet'}
          </button>
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="wallet-status">
            <h3>✅ Wallet Connected</h3>
            <div className="address-section">
              <label>Wallet Address:</label>
              <div className="address-display">
                <code>{wallet.address}</code>
                <button className="copy-btn" onClick={copyAddress}>
                  📋 Copy
                </button>
              </div>
            </div>
          </div>

          <div className="balance-section">
            <h3>💰 Wallet Balance</h3>
            <div className="balance-display">
              <div className="balance-amount">
                {wallet.formattedBalance}
              </div>
              <div className="balance-raw">
                Raw: {wallet.balance} octas
              </div>
              <button 
                className="refresh-btn"
                onClick={refreshBalance}
                disabled={wallet.loading}
              >
                {wallet.loading ? '🔄' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          <div className="transfer-section">
            <h3>💸 Transfer APT</h3>
            <div className="transfer-form">
              <div className="form-group">
                <label>Recipient Address:</label>
                <input
                  type="text"
                  value={transferData.recipient}
                  onChange={(e) => setTransferData(prev => ({
                    ...prev,
                    recipient: e.target.value
                  }))}
                  placeholder="0x..."
                  className="address-input"
                />
              </div>
              
              <div className="form-group">
                <label>Amount (APT):</label>
                <input
                  type="number"
                  value={transferData.amount}
                  onChange={(e) => setTransferData(prev => ({
                    ...prev,
                    amount: e.target.value
                  }))}
                  placeholder="0.0"
                  step="0.0001"
                  min="0"
                  className="amount-input"
                />
              </div>
              
              <button 
                className="transfer-btn"
                onClick={handleTransfer}
                disabled={wallet.loading || !transferData.recipient || !transferData.amount}
              >
                {wallet.loading ? '🔄 Processing...' : '💸 Transfer'}
              </button>
            </div>

            {transferResult && (
              <div className={`transfer-result ${transferResult.success ? 'success' : 'error'}`}>
                {transferResult.success ? (
                  <div>
                    ✅ Transfer successful!
                    <div>Hash: {transferResult.transactionHash}</div>
                  </div>
                ) : (
                  <div>❌ Transfer failed: {transferResult.error}</div>
                )}
              </div>
            )}
          </div>

          <div className="actions">
            <button 
              className="disconnect-btn"
              onClick={handleDisconnect}
            >
              🔌 Disconnect Wallet
            </button>
          </div>
        </div>
      )}

      <div className="contract-info">
        <h4>📋 Smart Contract Info</h4>
        <p>Contract Address: <code>0xaa7d8510c46f2a026d31d8e0a77394de9ac79c37547f4ecf4c4b8a5ff6c2f1d1</code></p>
        <p>Network: Aptos Devnet</p>
        <p>Module: simple_wallet</p>
      </div>
    </div>
  );
};

export default WalletIntegration;
