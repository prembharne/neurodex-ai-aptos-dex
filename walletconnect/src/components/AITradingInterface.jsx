// AITradingInterface.jsx - AI-powered trading interface  
import React, { useState, useEffect } from 'react';
import useAI from '../hooks/useAI';
import useWallet from '../hooks/useWallet';

const AITradingInterface = () => {
  const { connected, address } = useWallet();
  const { 
    isConnected: aiConnected, 
    loading, 
    error, 
    chat, 
    analyzeTrade, 
    checkAIHealth, 
    aiStatus 
  } = useAI();
  
  // Local state for managing the interface
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiTradeHistory, setAiTradeHistory] = useState([]);
  const [pendingExecution, setPendingExecution] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userConfirmation, setUserConfirmation] = useState({
    riskAccepted: false,
    maxSlippage: 0.5,
    confirmExecution: false
  });

  // Check AI health on mount
  useEffect(() => {
    checkAIHealth();
  }, [checkAIHealth]);

  const clearError = () => {
    // This would be handled by useAI hook internally
  };

  const clearSuggestion = () => {
    setAiSuggestion(null);
  };

  const handleGetSuggestion = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      // Create market context for better AI suggestions
      const marketData = {
        aptPrice: '$8.50', // This would come from your market data hooks
        trend: 'bullish',
        volume: '5.2M',
        volatility: 'medium',
        userBalance: '100 APT',
        address,
        connectedWallet: true
      };

      const response = await analyzeTrade(prompt, marketData);
      
      // Convert the AI response to suggestion format
      const suggestion = {
        reasoning: response.response,
        confidence: 0.85, // This could be extracted from AI response
        riskLevel: response.suggestion?.risk || 'medium',
        actions: response.suggestion?.actions || [],
        timestamp: response.timestamp,
        provider: response.provider
      };
      
      setAiSuggestion(suggestion);
      setPrompt('');
    } catch (err) {
      console.error('AI suggestion failed:', err);
    }
  };

  const handleExecuteTrade = async () => {
    if (!aiSuggestion || !userConfirmation.confirmExecution) return;

    try {
      setPendingExecution(true);
      
      // This is where you would integrate with your actual trading execution
      // For now, we'll simulate the execution and add to history
      const tradeResult = {
        id: Date.now(),
        tradeType: aiSuggestion.actions[0]?.type || 'trade',
        status: 'success', // This would be determined by actual execution
        executedAt: Date.now() / 1000,
        suggestion: aiSuggestion
      };
      
      setAiTradeHistory(prev => [tradeResult, ...prev]);
      setShowConfirmation(false);
      clearSuggestion();
      setUserConfirmation({
        riskAccepted: false,
        maxSlippage: 0.5,
        confirmExecution: false
      });
      
      console.log('Trade executed successfully:', tradeResult);
      
    } catch (err) {
      console.error('Trade execution failed:', err);
      // Add failed trade to history
      const failedTrade = {
        id: Date.now(),
        tradeType: aiSuggestion.actions[0]?.type || 'trade',
        status: 'failed',
        executedAt: Date.now() / 1000,
        error: err.message
      };
      setAiTradeHistory(prev => [failedTrade, ...prev]);
    } finally {
      setPendingExecution(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!connected) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Trading</h3>
        <p className="text-gray-600">Connect your wallet to access AI-powered trading.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-gray-900">AI Trading Assistant</h3>
          {/* AI Status Indicator */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            aiConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              aiConnected ? 'bg-green-600' : 'bg-red-600'
            }`}></div>
            <span>{aiConnected ? 'AI Connected' : 'AI Offline'}</span>
          </div>
        </div>
        {pendingExecution && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Executing trade...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!aiConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <p className="text-sm text-yellow-800">
            AI service is currently offline. Please check your internet connection or try again later.
          </p>
        </div>
      )}

      {/* AI Prompt Input */}
      <div className="space-y-4 mb-6">
        <form onSubmit={handleGetSuggestion} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask the AI for trading suggestions
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: 'I want to go long on APT with 2x leverage using 100 USDC' or 'Should I buy or sell based on current market conditions?'"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !aiConnected}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Getting AI Suggestion...' : aiConnected ? 'Get AI Suggestion' : 'AI Offline'}
          </button>
        </form>
      </div>

      {/* AI Suggestion Display */}
      {aiSuggestion && (
        <div className="space-y-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">AI Suggestion</h4>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(aiSuggestion.riskLevel)}`}>
                {aiSuggestion.riskLevel} risk
              </span>
              <span className="text-xs text-gray-500">
                Confidence: {Math.round(aiSuggestion.confidence * 100)}%
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-700 bg-white p-3 rounded border">
            {aiSuggestion.reasoning}
          </div>

          {/* Actionable Items */}
          {aiSuggestion.actions.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-gray-900">Suggested Actions:</h5>
              {aiSuggestion.actions.map((action, index) => (
                <div key={index} className="bg-white p-3 rounded border text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{action.type} - {action.action}</span>
                    <span className="text-gray-500">
                      {action.amount} {action.token || action.fromToken}
                      {action.leverage && ` (${action.leverage}x)`}
                    </span>
                  </div>
                  {action.market && (
                    <p className="text-gray-600 mt-1">Market: {action.market}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirmation(true)}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Execute Trade
            </button>
            <button
              onClick={clearSuggestion}
              className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && aiSuggestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Confirm AI Trade Execution</h4>
            
            <div className="space-y-4 mb-6">
              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  You are about to execute {aiSuggestion.actions.length} action(s) based on AI suggestion. 
                  Please review carefully.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={userConfirmation.riskAccepted}
                    onChange={(e) => setUserConfirmation(prev => ({ 
                      ...prev, 
                      riskAccepted: e.target.checked 
                    }))}
                  />
                  <span className="text-sm text-gray-700">
                    I understand the risks and have reviewed the suggested actions
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={userConfirmation.confirmExecution}
                    onChange={(e) => setUserConfirmation(prev => ({ 
                      ...prev, 
                      confirmExecution: e.target.checked 
                    }))}
                  />
                  <span className="text-sm text-gray-700">
                    I confirm I want to execute this trade
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Slippage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={userConfirmation.maxSlippage}
                  onChange={(e) => setUserConfirmation(prev => ({ 
                    ...prev, 
                    maxSlippage: parseFloat(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleExecuteTrade}
                disabled={!userConfirmation.riskAccepted || !userConfirmation.confirmExecution || loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Executing...' : 'Execute Now'}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade History */}
      {aiTradeHistory.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Recent AI Trades</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {aiTradeHistory.slice(0, 5).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                <span className="capitalize">{trade.tradeType}</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  trade.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {trade.status}
                </span>
                <span className="text-gray-500">
                  {new Date(trade.executedAt * 1000).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Example Prompts */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Example prompts:</h5>
        <div className="space-y-1 text-xs text-gray-600">
          <p>• "I want to go long APT with 2x leverage using 100 USDC"</p>
          <p>• "Should I buy or sell based on current market conditions?"</p>
          <p>• "Help me manage risk on my current positions"</p>
          <p>• "Suggest a hedging strategy for my portfolio"</p>
        </div>
      </div>
    </div>
  );
};

export default AITradingInterface;
