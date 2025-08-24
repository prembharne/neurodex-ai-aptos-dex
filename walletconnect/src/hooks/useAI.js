/**
 * useAI Hook - React integration for direct AI communication
 * Works around HTTP server issues with direct API calls
 */

import { useState, useEffect, useCallback } from 'react';
import { aiBridge, aiHelpers } from '../services/aiBridge';

export function useAI() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  // Check AI health on mount
  useEffect(() => {
    checkAIHealth();
  }, []);

  const checkAIHealth = useCallback(async () => {
    try {
      const health = await aiHelpers.checkHealth();
      setAiStatus(health);
      setIsConnected(health.connected);
      if (!health.connected) {
        setError(health.error);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err.message);
      setIsConnected(false);
    }
  }, []);

  const chat = useCallback(async (message) => {
    if (!message?.trim()) {
      throw new Error('Message cannot be empty');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await aiHelpers.chat(message);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMsg = err.message || 'AI chat failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeTrade = useCallback(async (prompt, marketData = {}) => {
    setLoading(true);
    setError(null);

    try {
      const analysis = await aiHelpers.analyzeTrade(prompt, marketData);
      setLastResponse(analysis);
      return analysis;
    } catch (err) {
      const errorMsg = err.message || 'Trade analysis failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Connection status
    isConnected,
    loading,
    error,
    aiStatus,
    
    // Core functions
    chat,
    analyzeTrade,
    checkAIHealth,
    
    // Response data
    lastResponse,
    
    // Utility
    clearError: () => setError(null),
    getStatus: aiHelpers.getStatus
  };
}

export default useAI;
