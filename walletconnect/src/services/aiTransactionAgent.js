// Enhanced AI Agent with Transaction Execution Capabilities
import aiBridge from './aiBridge.js';
import aptosService from './aptosService.js';

class AITransactionExecutor {
  constructor() {
    this.transactionPatterns = [
      {
        pattern: /(?:initiate|send|transfer|execute)\s+transaction\s+(?:to\s+)?(0x[0-9a-fA-F]{1,64}|[0-9a-fA-F]{1,64})\s*(?:amount\s+|for\s+)?(\d+(?:\.\d+)?)?/i,
        action: 'transfer',
        description: 'Transfer APT tokens'
      },
      {
        pattern: /(?:send|transfer)\s+(\d+(?:\.\d+)?)\s+(?:apt|tokens?)\s+(?:to\s+)?(0x[0-9a-fA-F]{1,64}|[0-9a-fA-F]{1,64})(?:\s+through\s+\w+)?(?:\s+network)?/i,
        action: 'transfer',
        description: 'Transfer specific amount of APT'
      },
      {
        pattern: /(?:connect|register)\s+wallet\s*(?:to\s+contract)?/i,
        action: 'connect',
        description: 'Connect wallet to smart contract'
      },
      {
        pattern: /(?:check|get|show)\s+(?:my\s+)?balance/i,
        action: 'balance',
        description: 'Check wallet balance'
      },
      {
        pattern: /(?:deploy|create)\s+(?:new\s+)?contract/i,
        action: 'deploy',
        description: 'Deploy smart contract'
      },
      {
        pattern: /(?:swap|exchange)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,
        action: 'swap',
        description: 'Token swap operation'
      }
    ];
  }

  async processCommand(userInput, walletAddress = null) {
    console.log('🚀 AI AGENT CALLED:', { userInput, walletAddress });
    try {
      // First, analyze the command with AI
      const analysis = await this.analyzeCommand(userInput);
      
      // Check for transaction patterns
      const matchedPattern = this.findMatchingPattern(userInput);
      console.log('🔍 Pattern matched:', matchedPattern);
      
      if (matchedPattern) {
        return await this.executeTransactionAction(matchedPattern, userInput, walletAddress);
      }
      
      // If no transaction pattern matched, return AI response with transaction capabilities info
      return await this.getEnhancedAIResponse(userInput, analysis);
      
    } catch (error) {
      console.error('❌ AI Agent Error:', error);
      return {
        success: false,
        message: `AI Transaction Error: ${error.message}`,
        type: 'error'
      };
    }
  }

  findMatchingPattern(input) {
    for (const pattern of this.transactionPatterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        return {
          ...pattern,
          matches: match
        };
      }
    }
    return null;
  }

  async executeTransactionAction(pattern, input, walletAddress) {
    const { action, matches } = pattern;
    
    switch (action) {
      case 'transfer':
        return await this.executeTransfer(matches, walletAddress);
      
      case 'connect':
        return await this.executeWalletConnection();
      
      case 'balance':
        return await this.executeBalanceCheck(walletAddress);
      
      case 'swap':
        return await this.executeSwap(matches);
      
      default:
        return {
          success: false,
          message: `Action "${action}" is not implemented yet`,
          type: 'info'
        };
    }
  }

  async executeTransfer(matches, walletAddress) {
    if (!walletAddress) {
      return {
        success: false,
        message: '🔐 Please connect your Petra wallet first to execute transactions',
        type: 'wallet_required',
        action: 'connect_wallet'
      };
    }

    let recipient, amount;
    
    // Pattern 1: "send transaction to ADDRESS amount AMOUNT"
    if (matches[1] && (matches[1].startsWith('0x') || /^[0-9a-fA-F]{1,64}$/.test(matches[1]))) {
      recipient = matches[1].startsWith('0x') ? matches[1] : '0x' + matches[1];
      amount = matches[2] ? parseFloat(matches[2]) : null;
    }
    // Pattern 2: "send AMOUNT APT to ADDRESS"  
    else if (matches[2] && (matches[2].startsWith('0x') || /^[0-9a-fA-F]{1,64}$/.test(matches[2]))) {
      amount = parseFloat(matches[1]);
      recipient = matches[2].startsWith('0x') ? matches[2] : '0x' + matches[2];
    }

    if (!recipient) {
      return {
        success: false,
        message: '❌ Invalid recipient address. Please provide a valid Aptos address (0x...)',
        type: 'validation_error'
      };
    }

    if (!amount || amount <= 0) {
      return {
        success: false,
        message: '❌ Please specify a valid amount to transfer (e.g., "send 1.5 APT to 0x...")',
        type: 'validation_error',
        suggestion: `Try: "send 1.0 APT to ${recipient.slice(0, 10)}..."`
      };
    }

    // Execute the transaction
    try {
      // First test wallet connection
      const walletTest = await aptosService.testWalletConnection();
      if (!walletTest.success) {
        return {
          success: false,
          message: `🔐 Wallet Connection Issue\n\n${walletTest.error}\n\nPlease:\n• Make sure Petra wallet is installed\n• Connect your wallet\n• Refresh the page and try again`,
          type: 'wallet_error',
          error: walletTest.error
        };
      }

      const result = await aptosService.transferApt(recipient, amount);
      
      if (result.success) {
        return {
          success: true,
          message: `✅ Transaction Executed Successfully!\n\n💰 Transferred: ${amount} APT\n📬 To: ${recipient.slice(0, 10)}...${recipient.slice(-6)}\n🔗 Transaction Hash: ${result.transactionHash}\n\n🎉 Your AI-powered transaction is complete!`,
          type: 'transaction_success',
          data: {
            amount,
            recipient,
            hash: result.transactionHash
          }
        };
      } else {
        return {
          success: false,
          message: `❌ Transaction Failed\n\n${result.error || 'Unknown error occurred'}\n\n💡 Common issues:\n• Insufficient balance\n• Invalid recipient address\n• Network connection problems\n• User cancelled transaction`,
          type: 'transaction_error',
          error: result.error
        };
      }
      
    } catch (error) {
      console.error('Transfer execution error:', error);
      return {
        success: false,
        message: `⚠️ Transaction Execution Error\n\n${error.message}\n\nThis could be due to:\n• Wallet connection issues\n• Network problems\n• Smart contract errors\n• User cancelled the transaction\n\nPlease try again or check your wallet connection.`,
        type: 'execution_error',
        error: error.message
      };
    }
  }

  async executeWalletConnection() {
    return {
      success: true,
      message: '🔗 Please click the "Connect Petra" button in the upper right corner to connect your wallet to our smart contract.\n\nOnce connected, you can:\n• Send APT with voice commands\n• Check your balance instantly\n• Execute smart contract functions\n• Access advanced DeFi features',
      type: 'wallet_instruction',
      action: 'connect_wallet'
    };
  }

  async executeBalanceCheck(walletAddress) {
    if (!walletAddress) {
      return {
        success: false,
        message: '🔐 Connect your wallet first to check balance',
        type: 'wallet_required',
        action: 'connect_wallet'
      };
    }

    try {
      const balanceResult = await aptosService.getWalletBalance(walletAddress);
      
      if (balanceResult.success) {
        return {
          success: true,
          message: `💰 Your Current Balance:\n\n🏦 Address: ${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}\n💎 Balance: ${balanceResult.formattedBalance}\n🔢 Raw Balance: ${balanceResult.balance} octas\n🌐 Network: Aptos Devnet\n📋 Contract: Our Smart Wallet\n\n✨ Balance fetched via AI command!`,
          type: 'balance_info',
          data: balanceResult
        };
      } else {
        return {
          success: false,
          message: `❌ Could not fetch balance: ${balanceResult.error}`,
          type: 'balance_error'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `🚨 Balance Check Error: ${error.message}`,
        type: 'execution_error'
      };
    }
  }

  async executeSwap(matches) {
    const [, amount, fromToken, toToken] = matches;
    
    return {
      success: false,
      message: `🔄 Token Swap Feature Coming Soon!\n\nRequested: ${amount} ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}\n\n🚧 We're building advanced DEX integration with:\n• Multi-pool routing\n• Slippage protection  \n• MEV resistance\n• AI-optimized execution\n\nStay tuned for the swap feature!`,
      type: 'feature_preview',
      data: { amount, fromToken, toToken }
    };
  }

  async analyzeCommand(input) {
    try {
      const analysisPrompt = `Analyze this user command for blockchain/crypto transaction intent: "${input}"
      
      Determine:
      1. Is this a transaction request?
      2. What type of action is requested?
      3. Are there any parameters (addresses, amounts)?
      4. Is the command clear and executable?
      
      Respond with a brief analysis.`;
      
      const result = await aiBridge.chat(analysisPrompt);
      const analysis = result?.response || result;
      // Ensure analysis is a string
      return typeof analysis === 'string' ? analysis : JSON.stringify(analysis);
    } catch (error) {
      return "Could not analyze command with AI.";
    }
  }

  async getEnhancedAIResponse(userInput, analysis) {
    try {
      const enhancedPrompt = `${userInput}

      Context: You are NeuroDEX AI, an advanced blockchain assistant with transaction execution capabilities.
      
      Available Commands:
      • "send [amount] APT to [address]" - Execute token transfers
      • "check my balance" - Get wallet balance  
      • "connect wallet" - Connect to smart contract
      • "initiate transaction to [address]" - Start transfer process
      
      Analysis: ${analysis}
      
      If the user is asking about transactions, explain the available commands. Otherwise, provide helpful blockchain/crypto information.`;
      
      const result = await aiBridge.chat(enhancedPrompt);
      const response = result?.response || result;
      
      return {
        success: true,
        message: typeof response === 'string' ? response : JSON.stringify(response),
        type: 'ai_response'
      };
    } catch (error) {
      return {
        success: false,
        message: 'AI is temporarily unavailable. Please try again.',
        type: 'ai_error'
      };
    }
  }

  getAvailableCommands() {
    return [
      "💸 send 1.5 APT to 0x123...",
      "📊 check my balance", 
      "🔗 connect wallet",
      "⚡ initiate transaction to 0x456...",
      "🔄 swap 10 APT for USDC",
      "📋 show transaction history"
    ];
  }
}

// Export enhanced AI agent
export default new AITransactionExecutor();

// Backward compatibility
export async function getChatResponse(messages) {
  const userMessage = messages[messages.length - 1]?.content || '';
  const result = await new AITransactionExecutor().processCommand(userMessage);
  
  if (result.success) {
    // Make sure we return a string
    return typeof result.message === 'string' ? result.message : JSON.stringify(result.message);
  } else {
    return result.message || 'AI processing failed';
  }
}
