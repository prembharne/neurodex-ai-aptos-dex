// React hook for smart contract wallet integration
import { useState, useEffect, useCallback } from 'react';
import aptosService from '../services/aptosService';

export const useSmartWallet = () => {
  const [wallet, setWallet] = useState({
    connected: false,
    address: null,
    balance: '0',
    formattedBalance: '0.0000 APT',
    loading: false,
    error: null
  });

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setWallet(prev => ({ ...prev, loading: true }));
      
      const isConnected = await aptosService.isConnected();
      if (isConnected) {
        const account = await aptosService.getAccount();
        if (account) {
          await updateWalletBalance(account.address);
          setWallet(prev => ({
            ...prev,
            connected: true,
            address: account.address,
            loading: false,
            error: null
          }));
        }
      } else {
        setWallet(prev => ({
          ...prev,
          connected: false,
          address: null,
          loading: false
        }));
      }
    } catch (error) {
      setWallet(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const connectWallet = useCallback(async () => {
    try {
      setWallet(prev => ({ ...prev, loading: true, error: null }));

      const result = await aptosService.connectWallet();
      
      if (result.success) {
        await updateWalletBalance(result.address);
        setWallet(prev => ({
          ...prev,
          connected: true,
          address: result.address,
          loading: false,
          error: null
        }));
        
        return { success: true, address: result.address };
      } else {
        setWallet(prev => ({
          ...prev,
          loading: false,
          error: result.error
        }));
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to connect wallet';
      setWallet(prev => ({
        ...prev,
        loading: false,
        error: errorMsg
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      const result = await aptosService.disconnectWallet();
      if (result.success) {
        setWallet({
          connected: false,
          address: null,
          balance: '0',
          formattedBalance: '0.0000 APT',
          loading: false,
          error: null
        });
        return { success: true };
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const updateWalletBalance = async (address) => {
    try {
      const balanceResult = await aptosService.getWalletBalance(address);
      if (balanceResult.success) {
        setWallet(prev => ({
          ...prev,
          balance: balanceResult.balance,
          formattedBalance: balanceResult.formattedBalance
        }));
      }
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  };

  const refreshBalance = useCallback(async () => {
    if (wallet.address) {
      await updateWalletBalance(wallet.address);
    }
  }, [wallet.address]);

  const transferApt = useCallback(async (recipient, amount) => {
    try {
      setWallet(prev => ({ ...prev, loading: true }));
      
      const result = await aptosService.transferApt(recipient, amount);
      
      if (result.success && wallet.address) {
        // Refresh balance after transfer
        await updateWalletBalance(wallet.address);
      }
      
      setWallet(prev => ({ ...prev, loading: false }));
      return result;
    } catch (error) {
      setWallet(prev => ({ ...prev, loading: false }));
      return { success: false, error: error.message };
    }
  }, [wallet.address]);

  return {
    wallet,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    transferApt,
    checkConnection
  };
};
