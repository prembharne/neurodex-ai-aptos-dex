// useWallet.js - Petra/Martian wallet connection hook
import { useState, useEffect, useCallback } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const NETWORK = Network.TESTNET; // Change to MAINNET for production
const aptosConfig = new AptosConfig({ network: NETWORK });
const aptos = new Aptos(aptosConfig);

export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [account, setAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if wallet is available
  const checkWalletAvailability = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    // Petra wallet
    if (window.aptos) return 'petra';
    
    // Martian wallet  
    if (window.martian) return 'martian';
    
    return null;
  }, []);

  const getWalletAdapter = useCallback((walletType) => {
    switch (walletType) {
      case 'petra':
        return window.aptos;
      case 'martian':
        return window.martian;
      default:
        return null;
    }
  }, []);

  const connectWallet = useCallback(async (walletType = 'petra') => {
    setConnecting(true);
    setError(null);

    try {
      const adapter = getWalletAdapter(walletType);
      if (!adapter) {
        throw new Error(`${walletType} wallet not found. Please install the extension.`);
      }

      // Request connection
      const response = await adapter.connect();
      
      if (response) {
        const accountInfo = await adapter.account();
        setWallet({ type: walletType, adapter });
        setAccount(accountInfo);
        setConnected(true);
        
        // Store connection preference
        localStorage.setItem('preferredWallet', walletType);
        localStorage.setItem('walletConnected', 'true');
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err.message);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [getWalletAdapter]);

  const disconnectWallet = useCallback(async () => {
    try {
      if (wallet?.adapter?.disconnect) {
        await wallet.adapter.disconnect();
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    } finally {
      setWallet(null);
      setAccount(null);
      setConnected(false);
      setError(null);
      localStorage.removeItem('walletConnected');
    }
  }, [wallet]);

  const signAndSubmitTransaction = useCallback(async (transaction) => {
    if (!wallet?.adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await wallet.adapter.signAndSubmitTransaction(transaction);
      return response;
    } catch (err) {
      console.error('Transaction failed:', err);
      throw err;
    }
  }, [wallet, connected]);

  const signTransaction = useCallback(async (transaction) => {
    if (!wallet?.adapter || !connected) {
      throw new Error('Wallet not connected');
    }

    try {
      const response = await wallet.adapter.signTransaction(transaction);
      return response;
    } catch (err) {
      console.error('Transaction signing failed:', err);
      throw err;
    }
  }, [wallet, connected]);

  // Auto-reconnect on page load
  useEffect(() => {
    const autoReconnect = async () => {
      const wasConnected = localStorage.getItem('walletConnected');
      const preferredWallet = localStorage.getItem('preferredWallet');
      
      if (wasConnected && preferredWallet) {
        const availableWallet = checkWalletAvailability();
        if (availableWallet === preferredWallet) {
          try {
            await connectWallet(preferredWallet);
          } catch (err) {
            console.warn('Auto-reconnect failed:', err);
          }
        }
      }
    };

    autoReconnect();
  }, [checkWalletAvailability, connectWallet]);

  // Listen for account changes
  useEffect(() => {
    if (!wallet?.adapter) return;

    const handleAccountChange = (newAccount) => {
      if (newAccount) {
        setAccount(newAccount);
      } else {
        disconnectWallet();
      }
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    // Petra events
    if (wallet.type === 'petra' && window.aptos) {
      window.aptos.onAccountChange(handleAccountChange);
      window.aptos.onDisconnect(handleDisconnect);
    }

    // Martian events
    if (wallet.type === 'martian' && window.martian) {
      window.martian.onAccountChange(handleAccountChange);
      window.martian.onDisconnect(handleDisconnect);
    }

    return () => {
      // Cleanup listeners if needed
    };
  }, [wallet, disconnectWallet]);

  return {
    // State
    wallet,
    account,
    connected,
    connecting,
    error,
    network: NETWORK,
    aptos,
    
    // Actions
    connectWallet,
    disconnectWallet,
    signAndSubmitTransaction,
    signTransaction,
    checkWalletAvailability,
    
    // Utilities
    address: account?.address,
    publicKey: account?.publicKey,
  };
};

export default useWallet;
