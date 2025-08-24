// useOrderBook.js - OrderBook contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName, TOKENS } from '../config/contractConfig';

export const useOrderBook = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });

  // Place a new order
  const placeOrder = useCallback(async ({
    side, // 'buy' or 'sell' 
    amount,
    price,
    baseToken = 'APT',
    quoteToken = 'USDC',
    orderType = 'limit' // 'limit' or 'market'
  }) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];
      
      if (!baseTokenConfig || !quoteTokenConfig) {
        throw new Error('Unsupported token pair');
      }

      // Convert amounts to proper decimals
      const amountInDecimals = Math.floor(parseFloat(amount) * Math.pow(10, baseTokenConfig.decimals));
      const priceInDecimals = Math.floor(parseFloat(price) * Math.pow(10, quoteTokenConfig.decimals));

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('ORDERBOOK', 'placeOrder'),
        type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
        arguments: [
          side === 'buy' ? '0' : '1', // 0 for buy, 1 for sell
          amountInDecimals.toString(),
          priceInDecimals.toString(),
          orderType === 'market' ? '1' : '0' // 0 for limit, 1 for market
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      // Refresh orders and orderbook
      await Promise.all([fetchUserOrders(), fetchOrderBook()]);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Cancel an existing order
  const cancelOrder = useCallback(async (orderId, baseToken = 'APT', quoteToken = 'USDC') => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('ORDERBOOK', 'cancelOrder'),
        type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
        arguments: [orderId.toString()]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });

      await Promise.all([fetchUserOrders(), fetchOrderBook()]);
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Fetch user's open orders
  const fetchUserOrders = useCallback(async (baseToken = 'APT', quoteToken = 'USDC') => {
    if (!connected || !address) return;

    try {
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const response = await aptos.view({
        payload: {
          function: buildFunctionName('ORDERBOOK', 'getUserOrders'),
          type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
          arguments: [address]
        }
      });

      // Parse orders data (adjust according to your contract structure)
      const orders = response[0].map(order => ({
        id: order.id,
        side: order.side === '0' ? 'buy' : 'sell',
        amount: parseFloat(order.amount) / Math.pow(10, baseTokenConfig.decimals),
        price: parseFloat(order.price) / Math.pow(10, quoteTokenConfig.decimals),
        filled: parseFloat(order.filled) / Math.pow(10, baseTokenConfig.decimals),
        timestamp: order.timestamp,
        status: order.status
      }));

      setUserOrders(orders);
      return orders;
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
      setUserOrders([]);
      return [];
    }
  }, [connected, address, aptos]);

  // Fetch current orderbook (bids and asks)
  const fetchOrderBook = useCallback(async (baseToken = 'APT', quoteToken = 'USDC', depth = 20) => {
    try {
      const baseTokenConfig = TOKENS[baseToken];
      const quoteTokenConfig = TOKENS[quoteToken];

      const response = await aptos.view({
        payload: {
          function: buildFunctionName('ORDERBOOK', 'getOrderBook'),
          type_arguments: [baseTokenConfig.address, quoteTokenConfig.address],
          arguments: [depth.toString()]
        }
      });

      // Parse orderbook data
      const [bidsData, asksData] = response;
      
      const bids = bidsData.map(bid => ({
        price: parseFloat(bid.price) / Math.pow(10, quoteTokenConfig.decimals),
        amount: parseFloat(bid.amount) / Math.pow(10, baseTokenConfig.decimals),
        total: parseFloat(bid.total) / Math.pow(10, baseTokenConfig.decimals)
      }));

      const asks = asksData.map(ask => ({
        price: parseFloat(ask.price) / Math.pow(10, quoteTokenConfig.decimals),
        amount: parseFloat(ask.amount) / Math.pow(10, baseTokenConfig.decimals),
        total: parseFloat(ask.total) / Math.pow(10, baseTokenConfig.decimals)
      }));

      const orderbookData = { bids, asks };
      setOrderBook(orderbookData);
      
      return orderbookData;
    } catch (err) {
      console.error('Failed to fetch orderbook:', err);
      setOrderBook({ bids: [], asks: [] });
      return { bids: [], asks: [] };
    }
  }, [aptos]);

  // Get best bid/ask prices
  const getBestPrices = useCallback(() => {
    const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : 0;
    const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : 0;
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
    const midPrice = bestAsk > 0 && bestBid > 0 ? (bestAsk + bestBid) / 2 : 0;

    return { bestBid, bestAsk, spread, midPrice };
  }, [orderBook]);

  // Auto-refresh data
  useEffect(() => {
    if (connected && address) {
      fetchUserOrders();
    }
    fetchOrderBook();

    // Set up polling for orderbook updates
    const interval = setInterval(() => {
      fetchOrderBook();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [connected, address, fetchUserOrders, fetchOrderBook]);

  return {
    // Actions
    placeOrder,
    cancelOrder,
    fetchUserOrders,
    fetchOrderBook,
    
    // State
    loading,
    error,
    userOrders,
    orderBook,
    
    // Utils
    getBestPrices,
    clearError: () => setError(null)
  };
};

export default useOrderBook;
