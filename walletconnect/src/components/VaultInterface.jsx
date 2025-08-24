// VaultInterface.jsx - Vault interaction component
import React, { useState } from 'react';
import useVault from '../hooks/useVault';
import useWallet from '../hooks/useWallet';

const VaultInterface = () => {
  const { connected } = useWallet();
  const {
    deposit,
    withdraw,
    loading,
    error,
    userBalance,
    totalSupply,
    clearError
  } = useVault();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('APT');
  const [txHash, setTxHash] = useState('');

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      clearError();
      const response = await deposit(depositAmount, selectedToken);
      setTxHash(response.hash);
      setDepositAmount('');
    } catch (err) {
      console.error('Deposit failed:', err);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    try {
      clearError();
      const response = await withdraw(withdrawAmount, selectedToken);
      setTxHash(response.hash);
      setWithdrawAmount('');
    } catch (err) {
      console.error('Withdraw failed:', err);
    }
  };

  if (!connected) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Vault</h3>
        <p className="text-gray-600">Connect your wallet to access vault features.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Vault</h3>
        <div className="text-sm text-gray-600">
          <p>Your Balance: <span className="font-medium">{userBalance?.toFixed(4) || '0'} {selectedToken}</span></p>
          <p>Total Supply: <span className="font-medium">{totalSupply?.toFixed(2) || '0'} {selectedToken}</span></p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {txHash && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
          <p className="text-sm text-green-800">
            Transaction successful:{' '}
            <a 
              href={`https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-900"
            >
              {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deposit Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Deposit</h4>
          <form onSubmit={handleDeposit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token
              </label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="APT">APT</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.0001"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !depositAmount}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </form>
        </div>

        {/* Withdraw Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Withdraw</h4>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.0001"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.0"
                max={userBalance}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {userBalance?.toFixed(4) || '0'} {selectedToken}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) > (userBalance || 0)}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </form>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setDepositAmount('1')}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            1 {selectedToken}
          </button>
          <button
            onClick={() => setDepositAmount('5')}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            5 {selectedToken}
          </button>
          <button
            onClick={() => setDepositAmount('10')}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            10 {selectedToken}
          </button>
          {userBalance > 0 && (
            <button
              onClick={() => setWithdrawAmount(userBalance.toString())}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Max Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultInterface;
