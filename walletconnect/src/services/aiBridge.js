/**
 * AI Bridge Service - Direct Groq Integration for React
 * Bypasses HTTP server issues by using direct API calls
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = "llama3-70b-8192";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

class AIBridge {
  constructor() {
    this.isConnected = !!GROQ_API_KEY;
    this.requestCount = 0;
  }

  /**
   * Direct AI chat - bypasses server issues
   */
  async chat(message, context = 'general') {
    if (!this.isConnected) {
      throw new Error('AI service not available - missing API key');
    }

    this.requestCount++;
    const requestId = `req_${Date.now()}_${this.requestCount}`;

    try {
      console.log(`🤖 [${requestId}] AI Chat Request:`, message);

      const systemPrompt = this.getSystemPrompt(context);
      
      const response = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.1,
          max_tokens: 1000,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response content from AI');
      }

      console.log(`✅ [${requestId}] AI Response received (${aiResponse.length} chars)`);

      return {
        response: aiResponse,
        provider: 'groq',
        model: GROQ_MODEL,
        timestamp: new Date().toISOString(),
        requestId,
        usage: {
          promptTokens: Math.ceil(message.length / 4),
          completionTokens: Math.ceil(aiResponse.length / 4),
          totalTokens: Math.ceil((message.length + aiResponse.length) / 4)
        }
      };

    } catch (error) {
      console.error(`❌ [${requestId}] AI Chat Error:`, error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  /**
   * Get trade suggestions from AI
   */
  async getTradeSuggestion(prompt, marketData = {}) {
    const context = this.buildTradingContext(marketData);
    const fullPrompt = `${context}\n\nUser Request: ${prompt}\n\nPlease provide a trading analysis and suggestion.`;
    
    const result = await this.chat(fullPrompt, 'trading');
    
    return {
      ...result,
      suggestion: this.parseTradeSuggestion(result.response),
      context: 'trading'
    };
  }

  /**
   * Execute AI-analyzed trade
   */
  async executeAITrade(tradeSuggestion, userConfirmation = {}) {
    if (!userConfirmation.riskAccepted) {
      throw new Error('User must accept risk before executing AI trades');
    }

    // This would integrate with your existing trading hooks
    const prompt = `Execute this trade suggestion: ${JSON.stringify(tradeSuggestion)}`;
    return await this.chat(prompt, 'execution');
  }

  /**
   * Get system prompt based on context
   */
  getSystemPrompt(context) {
    const basePrompt = `You are NeuroDex AI, an expert blockchain and DeFi trading assistant. You provide clear, accurate, and helpful information about cryptocurrencies, trading strategies, and blockchain technology.`;

    const contextPrompts = {
      general: `${basePrompt} Respond in a conversational and helpful manner.`,
      
      trading: `${basePrompt} 
        
TRADING CONTEXT:
- Focus on risk management and proper analysis
- Always mention potential risks and volatility
- Provide specific, actionable advice when possible
- Consider market conditions and user's risk tolerance
- Suggest proper position sizing and stop-loss levels

Remember to always remind users to do their own research (DYOR) and never invest more than they can afford to lose.`,

      execution: `${basePrompt}
        
EXECUTION CONTEXT:
- You're helping execute a trading decision
- Provide step-by-step guidance
- Include safety checks and confirmations
- Warn about slippage and gas fees
- Suggest optimal timing if relevant

Always prioritize user safety and proper risk management.`
    };

    return contextPrompts[context] || contextPrompts.general;
  }

  /**
   * Build trading context from market data
   */
  buildTradingContext(marketData) {
    if (!marketData || Object.keys(marketData).length === 0) {
      return "Current market data not available.";
    }

    return `
CURRENT MARKET DATA:
- APT Price: ${marketData.aptPrice || 'N/A'}
- Market Trend: ${marketData.trend || 'Unknown'}
- Volume: ${marketData.volume || 'N/A'}
- Volatility: ${marketData.volatility || 'Normal'}
- User Balance: ${marketData.userBalance || 'N/A'}
`;
  }

  /**
   * Parse AI response for trading suggestions
   */
  parseTradeSuggestion(response) {
    // Extract key trading info from AI response
    const suggestion = {
      action: this.extractAction(response),
      confidence: this.extractConfidence(response),
      riskLevel: this.extractRiskLevel(response),
      reasoning: response,
      warnings: this.extractWarnings(response)
    };

    return suggestion;
  }

  extractAction(text) {
    const actions = ['BUY', 'SELL', 'HOLD', 'LONG', 'SHORT'];
    for (const action of actions) {
      if (text.toUpperCase().includes(action)) {
        return action.toLowerCase();
      }
    }
    return 'hold';
  }

  extractConfidence(text) {
    const confidenceMatch = text.match(/(\d+)%?\s*(confidence|certain|sure)/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]) / 100;
    }
    return 0.5; // Default medium confidence
  }

  extractRiskLevel(text) {
    if (text.toLowerCase().includes('high risk')) return 'high';
    if (text.toLowerCase().includes('low risk')) return 'low';
    return 'medium';
  }

  extractWarnings(text) {
    const warnings = [];
    if (text.toLowerCase().includes('volatile')) warnings.push('High volatility expected');
    if (text.toLowerCase().includes('risk')) warnings.push('Consider risk management');
    if (text.toLowerCase().includes('dyor')) warnings.push('Do your own research');
    return warnings;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const testResponse = await this.chat("Hello", 'general');
      return {
        status: 'healthy',
        provider: 'groq',
        model: GROQ_MODEL,
        connected: true,
        lastTest: new Date().toISOString(),
        requestCount: this.requestCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: 'groq',
        connected: false,
        error: error.message,
        lastTest: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
export const aiBridge = new AIBridge();

// Export helper functions
export const aiHelpers = {
  // Quick chat function
  chat: (message) => aiBridge.chat(message),
  
  // Trading-specific functions
  analyzeTrade: (prompt, marketData) => aiBridge.getTradeSuggestion(prompt, marketData),
  
  // Health check
  checkHealth: () => aiBridge.healthCheck(),
  
  // Get AI status
  getStatus: () => ({
    connected: aiBridge.isConnected,
    provider: 'groq',
    model: GROQ_MODEL,
    requests: aiBridge.requestCount
  })
};

export default aiBridge;
