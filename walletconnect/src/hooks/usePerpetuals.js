// usePerpetuals.js - Perpetuals contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName, TOKENS } from '../config/contractConfig';

export const usePerpetuals = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPositions, setUserPositions] = useState([]);
  const [markPrices, setMarkPrices] = useState({});
  const [fundingRates, setFundingRates] = useState({});

  // Open a perpetual position
  const openPosition = useCallback(async ({
    market, // e.g., 'APT-USDC'
    side, // 'long' or 'short'
    size, // Position size
    leverage = 1,
    margin, // Margin amount
    slippage = 0.005 // 0.5% default slippage
  }) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];
      
      if (!baseTokenConfig || !quoteTokenConfig) {
        throw new Error('Unsupported market pair');
      }

      // Convert values to proper decimals
      const sizeInDecimals = Math.floor(parseFloat(size) * Math.pow(10, baseTokenConfig.decimals));
      const marginInDecimals = Math.floor(parseFloat(margin) * Math.pow(10, quoteTokenConfig.decimals));
      const leverageScaled = Math.floor(parseFloat(leverage) * 10000); // 10000 = 1x leverage
      const slippageScaled = Math.floor(parseFloat(slippage) * 10000); // 10000 = 100%

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('PERPETUALS', 'openPosition'),
        type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
        arguments: [
          side === 'long' ? '0' : '1', // 0 for long, 1 for short
          sizeInDecimals.toString(),
          leverageScaled.toString(),
          marginInDecimals.toString(),
          slippageScaled.toString()
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh positions
      await fetchUserPositions();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Close a perpetual position (full or partial)
  const closePosition = useCallback(async ({
    positionId,
    market,
    size = null, // null for full close, number for partial
    slippage = 0.005
  }) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      // Get position info to determine full size if not specified
      const position = userPositions.find(p => p.id === positionId);
      const closeSize = size ? size : position?.size || 0;
      
      const sizeInDecimals = Math.floor(parseFloat(closeSize) * Math.pow(10, baseTokenConfig.decimals));
      const slippageScaled = Math.floor(parseFloat(slippage) * 10000);

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('PERPETUALS', 'closePosition'),
        type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
        arguments: [
          positionId.toString(),
          sizeInDecimals.toString(),
          slippageScaled.toString()
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      await fetchUserPositions();
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos, userPositions]);

  // Fetch user's perpetual positions
  const fetchUserPositions = useCallback(async () => {
    if (!connected || !address) return;

    try {
      // Assuming your contract can return all user positions across markets
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('PERPETUALS', 'getUserPosition'),
          type_arguments: [],
          arguments: [address]
        }
      });

      // Parse positions data (adjust based on your contract structure)
      const positions = response[0].map(position => ({
        id: position.id,
        market: position.market,
        side: position.side === '0' ? 'long' : 'short',
        size: parseFloat(position.size) / Math.pow(10, 8), // Assuming 8 decimals
        entryPrice: parseFloat(position.entry_price) / Math.pow(10, 6), // Assuming 6 decimals
        margin: parseFloat(position.margin) / Math.pow(10, 6),
        leverage: parseFloat(position.leverage) / 10000,
        unrealizedPnl: parseFloat(position.unrealized_pnl) / Math.pow(10, 6),
        liquidationPrice: parseFloat(position.liquidation_price) / Math.pow(10, 6),
        timestamp: position.timestamp
      }));

      setUserPositions(positions);
      return positions;
    } catch (err) {
      console.error('Failed to fetch positions:', err);
      setUserPositions([]);
      return [];
    }
  }, [connected, address, aptos]);

  // Fetch mark price for a market
  const fetchMarkPrice = useCallback(async (market) => {
    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const response = await aptos.view({
        payload: {
          function: buildFunctionName('PERPETUALS', 'getMarkPrice'),
          type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
          arguments: []
        }
      });

      const price = parseFloat(response[0]) / Math.pow(10, 6); // Assuming 6 decimals for price
      
      setMarkPrices(prev => ({ ...prev, [market]: price }));
      return price;
    } catch (err) {
      console.error(`Failed to fetch mark price for ${market}:`, err);
      return 0;
    }
  }, [aptos]);

  // Fetch funding rate for a market
  const fetchFundingRate = useCallback(async (market) => {
    try {
      const [baseToken, quoteToken] = market.split('-');
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const response = await aptos.view({
        payload: {
          function: buildFunctionName('PERPETUALS', 'getFundingRate'),
          type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
          arguments: []
        }
      });

      // Funding rate is typically expressed as a percentage per hour
      const rate = parseFloat(response[0]) / Math.pow(10, 6); // Adjust decimals as needed
      
      setFundingRates(prev => ({ ...prev, [market]: rate }));
      return rate;
    } catch (err) {
      console.error(`Failed to fetch funding rate for ${market}:`, err);
      return 0;
    }
  }, [aptos]);

  // Calculate position PnL based on current mark price
  const calculatePnL = useCallback((position, currentMarkPrice) => {
    if (!currentMarkPrice || !position) return 0;

    const { side, size, entryPrice } = position;
    const priceDiff = currentMarkPrice - entryPrice;
    
    // Long: profit when price goes up, Short: profit when price goes down
    const multiplier = side === 'long' ? 1 : -1;
    const unrealizedPnl = multiplier * priceDiff * size;
    
    return unrealizedPnl;
  }, []);

  // Calculate liquidation price
  const calculateLiquidationPrice = useCallback((position, maintenanceMarginRate = 0.05) => {
    if (!position) return 0;

    const { side, entryPrice, leverage, margin, size } = position;
    
    // Simplified liquidation calculation (adjust based on your contract logic)
    const maintenanceMargin = margin * maintenanceMarginRate;
    const liquidationDistance = (margin - maintenanceMargin) / size;
    
    if (side === 'long') {
      return entryPrice - liquidationDistance;
    } else {
      return entryPrice + liquidationDistance;
    }
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (connected && address) {
      fetchUserPositions();
    }

    // Common markets to fetch prices for
    const markets = ['APT-USDC', 'BTC-USDC', 'ETH-USDC'];
    markets.forEach(market => {
      fetchMarkPrice(market);
      fetchFundingRate(market);
    });

    // Set up polling for price updates
    const interval = setInterval(() => {
      markets.forEach(market => {
        fetchMarkPrice(market);
        fetchFundingRate(market);
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [connected, address, fetchUserPositions, fetchMarkPrice, fetchFundingRate]);

  return {
    // Actions
    openPosition,
    closePosition,
    fetchUserPositions,
    fetchMarkPrice,
    fetchFundingRate,
    
    // State
    loading,
    error,
    userPositions,
    markPrices,
    fundingRates,
    
    // Utils
    calculatePnL,
    calculateLiquidationPrice,
    clearError: () => setError(null)
  };
};

export default usePerpetuals;
