// useVault.js - Vault contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName, TOKENS } from '../config/contractConfig';

export const useVault = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);

  // Deposit tokens to vault
  const deposit = useCallback(async (amount, tokenType = 'APT') => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const token = TOKENS[tokenType];
      if (!token) throw new Error(`Token ${tokenType} not supported`);

      // Convert amount to proper decimals (e.g., 1.5 APT = 150000000)
      const amountInDecimals = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('VAULT', 'deposit'),
        type_arguments: [token.address],
        arguments: [amountInDecimals.toString()]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      // Wait for transaction confirmation
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh user balance
      await fetchUserBalance();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Withdraw tokens from vault  
  const withdraw = useCallback(async (amount, tokenType = 'APT') => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const token = TOKENS[tokenType];
      if (!token) throw new Error(`Token ${tokenType} not supported`);

      const amountInDecimals = Math.floor(parseFloat(amount) * Math.pow(10, token.decimals));

      const transaction = {
        type: "entry_function_payload", 
        function: buildFunctionName('VAULT', 'withdraw'),
        type_arguments: [token.address],
        arguments: [amountInDecimals.toString()]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      await fetchUserBalance();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Fetch user's vault balance
  const fetchUserBalance = useCallback(async (tokenType = 'APT') => {
    if (!connected || !address) return;

    try {
      const token = TOKENS[tokenType];
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('VAULT', 'getUserBalance'),
          type_arguments: [token.address],
          arguments: [address]
        }
      });

      const balance = response[0];
      const formattedBalance = parseFloat(balance) / Math.pow(10, token.decimals);
      setUserBalance(formattedBalance);
      
      return formattedBalance;
    } catch (err) {
      console.error('Failed to fetch user balance:', err);
      setUserBalance(0);
      return 0;
    }
  }, [connected, address, aptos]);

  // Fetch total vault supply
  const fetchTotalSupply = useCallback(async (tokenType = 'APT') => {
    try {
      const token = TOKENS[tokenType];
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('VAULT', 'getTotalSupply'),
          type_arguments: [token.address],
          arguments: []
        }
      });

      const supply = response[0];
      const formattedSupply = parseFloat(supply) / Math.pow(10, token.decimals);
      setTotalSupply(formattedSupply);
      
      return formattedSupply;
    } catch (err) {
      console.error('Failed to fetch total supply:', err);
      setTotalSupply(0);
      return 0;
    }
  }, [aptos]);

  // Auto-refresh data when connected
  useEffect(() => {
    if (connected && address) {
      fetchUserBalance();
      fetchTotalSupply();
    }
  }, [connected, address, fetchUserBalance, fetchTotalSupply]);

  return {
    // Actions
    deposit,
    withdraw,
    fetchUserBalance,
    fetchTotalSupply,
    
    // State
    loading,
    error,
    userBalance,
    totalSupply,
    
    // Utils
    clearError: () => setError(null)
  };
};

export default useVault;
