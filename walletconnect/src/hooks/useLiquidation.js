// useLiquidation.js - Liquidation contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName, TOKENS } from '../config/contractConfig';

export const useLiquidation = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liquidatablePositions, setLiquidatablePositions] = useState([]);
  const [userHealthFactor, setUserHealthFactor] = useState(null);

  // Execute liquidation of an undercollateralized position
  const executeLiquidation = useCallback(async ({
    targetAddress,
    positionId,
    market,
    liquidationSize = null // null for full liquidation
  }) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const sizeInDecimals = liquidationSize 
        ? Math.floor(parseFloat(liquidationSize) * Math.pow(10, baseTokenConfig.decimals)).toString()
        : '0'; // 0 indicates full liquidation

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('LIQUIDATION', 'executeLiquidation'),
        type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
        arguments: [
          targetAddress,
          positionId.toString(),
          sizeInDecimals
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh liquidatable positions
      await fetchLiquidatablePositions();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Check if a specific position is liquidatable
  const checkLiquidation = useCallback(async (userAddress, positionId, market) => {
    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const response = await aptos.view({
        payload: {
          function: buildFunctionName('LIQUIDATION', 'checkLiquidation'),
          type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
          arguments: [userAddress, positionId.toString()]
        }
      });

      // Response format: [isLiquidatable, healthFactor, liquidationPrice, penalty]
      const [isLiquidatable, healthFactor, liquidationPrice, penalty] = response;

      return {
        isLiquidatable: isLiquidatable === '1',
        healthFactor: parseFloat(healthFactor) / Math.pow(10, 6),
        liquidationPrice: parseFloat(liquidationPrice) / Math.pow(10, 6),
        penalty: parseFloat(penalty) / Math.pow(10, 6)
      };
    } catch (err) {
      console.error('Failed to check liquidation:', err);
      return {
        isLiquidatable: false,
        healthFactor: 0,
        liquidationPrice: 0,
        penalty: 0
      };
    }
  }, [aptos]);

  // Fetch all liquidatable positions (for liquidators)
  const fetchLiquidatablePositions = useCallback(async (limit = 50) => {
    try {
      // This assumes your contract has a function to get liquidatable positions
      // You might need to implement this differently based on your architecture
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('LIQUIDATION', 'getLiquidatablePositions'),
          type_arguments: [],
          arguments: [limit.toString()]
        }
      });

      const positions = response[0].map(position => ({
        id: position.id,
        owner: position.owner,
        market: position.market,
        side: position.side === '0' ? 'long' : 'short',
        size: parseFloat(position.size) / Math.pow(10, 8),
        entryPrice: parseFloat(position.entry_price) / Math.pow(10, 6),
        currentPrice: parseFloat(position.current_price) / Math.pow(10, 6),
        healthFactor: parseFloat(position.health_factor) / Math.pow(10, 6),
        liquidationPrice: parseFloat(position.liquidation_price) / Math.pow(10, 6),
        reward: parseFloat(position.liquidation_reward) / Math.pow(10, 6),
        timestamp: position.timestamp
      }));

      setLiquidatablePositions(positions);
      return positions;
    } catch (err) {
      console.error('Failed to fetch liquidatable positions:', err);
      setLiquidatablePositions([]);
      return [];
    }
  }, [aptos]);

  // Fetch user's health factor
  const fetchUserHealthFactor = useCallback(async (userAddress = null) => {
    const targetAddress = userAddress || address;
    if (!targetAddress) return;

    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('LIQUIDATION', 'getUserHealthFactor'),
          type_arguments: [],
          arguments: [targetAddress]
        }
      });

      const healthFactor = parseFloat(response[0]) / Math.pow(10, 6);
      
      if (userAddress === null || userAddress === address) {
        setUserHealthFactor(healthFactor);
      }
      
      return healthFactor;
    } catch (err) {
      console.error('Failed to fetch health factor:', err);
      if (userAddress === null || userAddress === address) {
        setUserHealthFactor(null);
      }
      return 0;
    }
  }, [address, aptos]);

  // Get liquidation threshold (minimum health factor before liquidation)
  const getLiquidationThreshold = useCallback(async () => {
    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('LIQUIDATION', 'getLiquidationThreshold'),
          type_arguments: [],
          arguments: []
        }
      });

      return parseFloat(response[0]) / Math.pow(10, 6); // Usually around 1.0 (100%)
    } catch (err) {
      console.error('Failed to fetch liquidation threshold:', err);
      return 1.0; // Default threshold
    }
  }, [aptos]);

  // Calculate liquidation risk level
  const getLiquidationRisk = useCallback((healthFactor, threshold = 1.0) => {
    if (!healthFactor || healthFactor <= 0) return 'unknown';
    
    if (healthFactor <= threshold) return 'liquidatable';
    if (healthFactor <= threshold * 1.1) return 'critical'; // Within 10% of liquidation
    if (healthFactor <= threshold * 1.3) return 'high'; // Within 30% of liquidation
    if (healthFactor <= threshold * 1.5) return 'medium'; // Within 50% of liquidation
    return 'low';
  }, []);

  // Estimate liquidation reward for liquidators
  const estimateLiquidationReward = useCallback((positionValue, liquidationPenalty = 0.05) => {
    // Typically liquidators receive a percentage of the position value as reward
    return positionValue * liquidationPenalty;
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (connected && address) {
      fetchUserHealthFactor();
    }

    // Refresh liquidatable positions for liquidators
    fetchLiquidatablePositions();

    // Set up polling for updates
    const interval = setInterval(() => {
      if (connected && address) {
        fetchUserHealthFactor();
      }
      fetchLiquidatablePositions();
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, [connected, address, fetchUserHealthFactor, fetchLiquidatablePositions]);

  return {
    // Actions
    executeLiquidation,
    checkLiquidation,
    fetchLiquidatablePositions,
    fetchUserHealthFactor,
    getLiquidationThreshold,
    
    // State
    loading,
    error,
    liquidatablePositions,
    userHealthFactor,
    
    // Utils
    getLiquidationRisk,
    estimateLiquidationReward,
    clearError: () => setError(null)
  };
};

export default useLiquidation;
