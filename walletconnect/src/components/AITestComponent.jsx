// AITestComponent.jsx - Simple test component for AI integration
import React, { useState, useEffect } from 'react';
import useAI from '../hooks/useAI';

const AITestComponent = () => {
  const { isConnected, loading, error, chat, checkAIHealth, aiStatus } = useAI();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    checkAIHealth();
  }, [checkAIHealth]);

  const handleSendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat
    setChatHistory(prev => [...prev, { 
      type: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    }]);

    try {
      const response = await chat(userMessage);
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: response.response, 
        timestamp: response.timestamp,
        provider: response.provider,
        model: response.model
      }]);
      
    } catch (err) {
      setChatHistory(prev => [...prev, { 
        type: 'error', 
        content: `Error: ${err.message}`, 
        timestamp: new Date().toISOString() 
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Test Interface</h3>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-600' : 'bg-red-600'
            }`}></div>
            <span>{isConnected ? 'AI Connected' : 'AI Offline'}</span>
          </div>
          {aiStatus && (
            <span className="text-sm text-gray-600">
              Model: {aiStatus.model || 'Unknown'}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Chat History */}
      <div className="mb-6 h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
        {chatHistory.length === 0 ? (
          <p className="text-gray-500 text-center">Start a conversation with the AI...</p>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((msg, index) => (
              <div key={index} className={`flex ${
                msg.type === 'user' ? 'justify-end' : 'justify-start'
              }`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : msg.type === 'error'
                    ? 'bg-red-100 text-red-800 border border-red-200'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    {msg.provider && (
                      <span>via {msg.provider}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex space-x-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here... (Press Enter to send)"
          rows={3}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !message.trim() || !isConnected}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Quick Test Messages */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Quick test messages:</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Hello, can you help me with trading?",
            "What is APT cryptocurrency?",
            "Explain blockchain basics",
            "Give me trading advice"
          ].map((testMsg, index) => (
            <button
              key={index}
              onClick={() => setMessage(testMsg)}
              className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
            >
              {testMsg}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AITestComponent;
