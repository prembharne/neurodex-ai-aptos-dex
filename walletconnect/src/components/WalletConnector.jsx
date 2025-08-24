// WalletConnector.jsx - Main wallet connection component
import React from 'react';
import useWallet from '../hooks/useWallet';

const WalletConnector = () => {
  const {
    connected,
    connecting,
    account,
    error,
    connectWallet,
    disconnectWallet,
    checkWalletAvailability
  } = useWallet();

  const availableWallet = checkWalletAvailability();

  if (connected && account) {
    return (
      <div className="flex items-center space-x-4 bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">Connected</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
          </p>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Connect Wallet</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* Petra Wallet */}
        <button
          onClick={() => connectWallet('petra')}
          disabled={connecting || !availableWallet}
          className={`w-full flex items-center justify-center space-x-3 p-3 border rounded-md transition-colors ${
            availableWallet === 'petra'
              ? 'border-blue-300 hover:bg-blue-50 text-blue-900'
              : 'border-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="w-6 h-6 bg-blue-600 rounded"></div>
          <span className="font-medium">
            {connecting ? 'Connecting...' : 'Connect Petra Wallet'}
          </span>
          {availableWallet !== 'petra' && !window.aptos && (
            <span className="text-xs text-gray-400">(Not installed)</span>
          )}
        </button>

        {/* Martian Wallet */}
        <button
          onClick={() => connectWallet('martian')}
          disabled={connecting || availableWallet !== 'martian'}
          className={`w-full flex items-center justify-center space-x-3 p-3 border rounded-md transition-colors ${
            availableWallet === 'martian'
              ? 'border-purple-300 hover:bg-purple-50 text-purple-900'
              : 'border-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <div className="w-6 h-6 bg-purple-600 rounded"></div>
          <span className="font-medium">
            {connecting ? 'Connecting...' : 'Connect Martian Wallet'}
          </span>
          {availableWallet !== 'martian' && !window.martian && (
            <span className="text-xs text-gray-400">(Not installed)</span>
          )}
        </button>
      </div>

      {!availableWallet && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            No supported wallet found. Please install{' '}
            <a 
              href="https://petra.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Petra
            </a>{' '}
            or{' '}
            <a 
              href="https://martianwallet.xyz/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-purple-600 underline hover:text-purple-800"
            >
              Martian
            </a>{' '}
            wallet extension.
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>Connected to Aptos Testnet</p>
        <p>Make sure you have APT tokens for gas fees</p>
      </div>
    </div>
  );
};

export default WalletConnector;
