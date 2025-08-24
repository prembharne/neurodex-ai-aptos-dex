// useAIExecutor.js - AI Executor contract interaction hooks
import { useState, useCallback, useEffect } from 'react';
import useWallet from './useWallet';
import { buildFunctionName } from '../config/contractConfig';

// AI Agent API service
const AI_AGENT_API_URL = process.env.REACT_APP_AI_AGENT_API || 'http://localhost:3004/api';

export const useAIExecutor = () => {
  const { aptos, signAndSubmitTransaction, connected, address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiTradeHistory, setAiTradeHistory] = useState([]);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [pendingExecution, setPendingExecution] = useState(null);

  // Get AI trade suggestion from backend
  const getAITradeSuggestion = useCallback(async (prompt, userContext = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${AI_AGENT_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a DeFi trading AI assistant. Analyze the user's request and provide trading suggestions. 
                       Include specific parameters like token pairs, amounts, leverage, etc. 
                       User context: ${JSON.stringify(userContext)}`
            },
            {
              role: 'user', 
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      
      // Parse AI response to extract actionable trade parameters
      const suggestion = await parseAIResponse(data.reply, userContext);
      setAiSuggestion(suggestion);
      
      return suggestion;
    } catch (err) {
      setError(`AI service error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Parse AI response to extract structured trade data
  const parseAIResponse = useCallback(async (aiResponse, userContext) => {
    // This is a simplified parser - you might want to enhance this
    // or have your AI backend return structured JSON
    
    const suggestion = {
      id: Date.now().toString(),
      originalPrompt: aiResponse,
      timestamp: new Date().toISOString(),
      confidence: 0.8, // Default confidence
      actions: [],
      reasoning: aiResponse,
      riskLevel: 'medium'
    };

    // Extract actions using regex or more sophisticated NLP
    // For demo purposes, using simple pattern matching
    
    // Check for perpetual trading patterns
    const perpPattern = /(open|long|short)\s+([\d.]+)\s*([A-Z]+).*?leverage\s*([\d.]+)/gi;
    let match;
    while ((match = perpPattern.exec(aiResponse)) !== null) {
      suggestion.actions.push({
        type: 'perpetual',
        action: match[1].toLowerCase(), // open/long/short
        amount: parseFloat(match[2]),
        token: match[3],
        leverage: parseFloat(match[4]),
        market: `${match[3]}-USDC`
      });
    }

    // Check for spot trading patterns  
    const spotPattern = /(buy|sell|swap)\s+([\d.]+)\s*([A-Z]+)(?:\s+for\s+([A-Z]+))?/gi;
    while ((match = spotPattern.exec(aiResponse)) !== null) {
      suggestion.actions.push({
        type: 'spot',
        action: match[1].toLowerCase(),
        amount: parseFloat(match[2]),
        fromToken: match[3],
        toToken: match[4] || 'USDC'
      });
    }

    // Check for vault operations
    const vaultPattern = /(deposit|withdraw)\s+([\d.]+)\s*([A-Z]+)/gi;
    while ((match = vaultPattern.exec(aiResponse)) !== null) {
      suggestion.actions.push({
        type: 'vault',
        action: match[1].toLowerCase(),
        amount: parseFloat(match[2]),
        token: match[3]
      });
    }

    return suggestion;
  }, []);

  // Execute AI-suggested trade through smart contract
  const executeAITrade = useCallback(async (suggestion, userConfirmation = {}) => {
    if (!connected) throw new Error('Wallet not connected');
    if (!suggestion || !suggestion.actions.length) {
      throw new Error('No valid actions in AI suggestion');
    }
    
    setLoading(true);
    setError(null);
    setPendingExecution(suggestion);

    try {
      const results = [];

      for (const action of suggestion.actions) {
        let transaction;

        switch (action.type) {
          case 'perpetual':
            transaction = {
              type: "entry_function_payload",
              function: buildFunctionName('AI_EXECUTOR', 'executeAITrade'),
              type_arguments: [],
              arguments: [
                'perpetual', // trade type
                JSON.stringify(action), // trade parameters
                suggestion.id, // suggestion ID for tracking
                userConfirmation.riskAccepted ? '1' : '0'
              ]
            };
            break;

          case 'spot':
            transaction = {
              type: "entry_function_payload", 
              function: buildFunctionName('AI_EXECUTOR', 'executeAITrade'),
              type_arguments: [],
              arguments: [
                'spot',
                JSON.stringify(action),
                suggestion.id,
                userConfirmation.riskAccepted ? '1' : '0'
              ]
            };
            break;

          case 'vault':
            transaction = {
              type: "entry_function_payload",
              function: buildFunctionName('AI_EXECUTOR', 'executeAITrade'), 
              type_arguments: [],
              arguments: [
                'vault',
                JSON.stringify(action),
                suggestion.id,
                userConfirmation.riskAccepted ? '1' : '0'
              ]
            };
            break;

          default:
            throw new Error(`Unsupported action type: ${action.type}`);
        }

        const response = await signAndSubmitTransaction(transaction);
        
        await aptos.waitForTransaction({
          transactionHash: response.hash,
          options: { timeoutSecs: 30, checkSuccess: true }
        });

        results.push({
          action,
          transactionHash: response.hash,
          status: 'success'
        });
      }

      // Log successful execution
      await logAIExecution(suggestion, results, 'success');

      // Refresh trade history
      await fetchAITradeHistory();
      
      return results;
    } catch (err) {
      // Log failed execution
      await logAIExecution(suggestion, [], 'failed', err.message);
      
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
      setPendingExecution(null);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Log AI execution for tracking and learning
  const logAIExecution = useCallback(async (suggestion, results, status, errorMessage = null) => {
    try {
      await fetch(`${AI_AGENT_API_URL}/ai/log-execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          userAddress: address,
          suggestion,
          results,
          status,
          errorMessage,
          timestamp: new Date().toISOString()
        })
      });
    } catch (err) {
      console.warn('Failed to log AI execution:', err);
    }
  }, [address]);

  // Register AI agent permissions
  const registerAIAgent = useCallback(async (aiAgentConfig) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('AI_EXECUTOR', 'registerAIAgent'),
        type_arguments: [],
        arguments: [
          aiAgentConfig.name || 'Default AI Agent',
          aiAgentConfig.maxTradeAmount || '1000000000', // 10 tokens with 8 decimals
          aiAgentConfig.allowedActions || ['perpetual', 'spot', 'vault'],
          aiAgentConfig.riskThreshold || '5000' // 50%
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Fetch AI trade execution history
  const fetchAITradeHistory = useCallback(async (limit = 50) => {
    if (!connected || !address) return;

    try {
      const response = await aptos.view({
        payload: {
          function: buildFunctionName('AI_EXECUTOR', 'getAITradeHistory'),
          type_arguments: [],
          arguments: [address, limit.toString()]
        }
      });

      const history = response[0].map(record => ({
        id: record.id,
        suggestionId: record.suggestion_id,
        tradeType: record.trade_type,
        parameters: JSON.parse(record.parameters),
        status: record.status,
        transactionHash: record.transaction_hash,
        executedAt: parseInt(record.executed_at),
        gasUsed: record.gas_used,
        profit: parseFloat(record.profit) / Math.pow(10, 6)
      }));

      setAiTradeHistory(history);
      return history;
    } catch (err) {
      console.error('Failed to fetch AI trade history:', err);
      setAiTradeHistory([]);
      return [];
    }
  }, [connected, address, aptos]);

  // Update AI permissions
  const updateAIPermissions = useCallback(async (newPermissions) => {
    if (!connected) throw new Error('Wallet not connected');
    
    setLoading(true);
    setError(null);

    try {
      const transaction = {
        type: "entry_function_payload",
        function: buildFunctionName('AI_EXECUTOR', 'updateAIPermissions'),
        type_arguments: [],
        arguments: [
          newPermissions.maxTradeAmount || '1000000000',
          newPermissions.allowedActions || ['perpetual', 'spot', 'vault'],
          newPermissions.riskThreshold || '5000',
          newPermissions.enabled ? '1' : '0'
        ]
      };

      const response = await signAndSubmitTransaction(transaction);
      
      await aptos.waitForTransaction({
        transactionHash: response.hash,
        options: { timeoutSecs: 30, checkSuccess: true }
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connected, signAndSubmitTransaction, aptos]);

  // Auto-refresh data
  useEffect(() => {
    if (connected && address) {
      fetchAITradeHistory();
    }

    // Set up polling for trade history updates
    const interval = setInterval(() => {
      if (connected && address) {
        fetchAITradeHistory();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [connected, address, fetchAITradeHistory]);

  return {
    // Actions
    getAITradeSuggestion,
    executeAITrade,
    registerAIAgent,
    updateAIPermissions,
    fetchAITradeHistory,
    
    // State
    loading,
    error,
    aiTradeHistory,
    aiSuggestion,
    pendingExecution,
    
    // Utils
    parseAIResponse,
    clearError: () => setError(null),
    clearSuggestion: () => setAiSuggestion(null)
  };
};

export default useAIExecutor;
