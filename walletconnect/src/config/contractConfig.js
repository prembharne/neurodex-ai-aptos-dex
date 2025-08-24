// contractConfig.js - Your deployed contract addresses and functions
export const CONTRACT_CONFIG = {
  // Replace with your actual deployed addresses
  VAULT: {
    address: "0x123456789abcdef", // Replace with your Vault.move deployment address
    moduleName: "Vault",
    functions: {
      deposit: "deposit",
      withdraw: "withdraw",
      getUserBalance: "get_user_balance",
      getTotalSupply: "get_total_supply",
      getAvailableBalance: "get_available_balance"
    }
  },
  
  ORDERBOOK: {
    address: "0x123456789abcdef", // Replace with your OrderBook.move deployment address  
    moduleName: "OrderBook",
    functions: {
      placeOrder: "place_order",
      cancelOrder: "cancel_order",
      matchOrders: "match_orders",
      getUserOrders: "get_user_orders",
      getOrderBook: "get_order_book",
      getOrderById: "get_order_by_id"
    }
  },

  PERPETUALS: {
    address: "0x123456789abcdef", // Replace with your Perpetuals.move deployment address
    moduleName: "Perpetuals", 
    functions: {
      openPosition: "open_position",
      closePosition: "close_position",
      liquidatePosition: "liquidate_position",
      getUserPosition: "get_user_position",
      getFundingRate: "get_funding_rate",
      getMarkPrice: "get_mark_price",
      updateFunding: "update_funding"
    }
  },

  LIQUIDATION: {
    address: "0x123456789abcdef", // Replace with your Liquidation.move deployment address
    moduleName: "Liquidation",
    functions: {
      checkLiquidation: "check_liquidation",
      executeLiquidation: "execute_liquidation",
      getLiquidationThreshold: "get_liquidation_threshold",
      getUserHealthFactor: "get_user_health_factor"
    }
  },

  GOVERNANCE: {
    address: "0x123456789abcdef", // Replace with your Governance.move deployment address
    moduleName: "Governance",
    functions: {
      createProposal: "create_proposal",
      vote: "vote",
      executeProposal: "execute_proposal",
      getProposal: "get_proposal",
      getUserVotingPower: "get_user_voting_power",
      getProposalState: "get_proposal_state"
    }
  },

  AI_EXECUTOR: {
    address: "0x123456789abcdef", // Replace with your AIExecutor.move deployment address
    moduleName: "AIExecutor",
    functions: {
      executeAITrade: "execute_ai_trade",
      registerAIAgent: "register_ai_agent",
      getAITradeHistory: "get_ai_trade_history",
      updateAIPermissions: "update_ai_permissions"
    }
  }
};

// Token configurations
export const TOKENS = {
  APT: {
    address: "0x1::aptos_coin::AptosCoin",
    symbol: "APT",
    decimals: 8,
    name: "Aptos Coin"
  },
  USDC: {
    address: "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC", 
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  }
  // Add more tokens as needed
};

// Helper function to build full function names
export const buildFunctionName = (contractKey, functionKey) => {
  const config = CONTRACT_CONFIG[contractKey];
  if (!config) throw new Error(`Contract ${contractKey} not found`);
  
  const functionName = config.functions[functionKey];
  if (!functionName) throw new Error(`Function ${functionKey} not found in ${contractKey}`);
  
  return `${config.address}::${config.moduleName}::${functionName}`;
};

// Network and RPC configurations
export const NETWORK_CONFIG = {
  testnet: {
    name: "Aptos Testnet",
    rpcUrl: "https://fullnode.testnet.aptoslabs.com/v1",
    explorerUrl: "https://explorer.aptoslabs.com",
    faucetUrl: "https://faucet.testnet.aptoslabs.com"
  },
  mainnet: {
    name: "Aptos Mainnet", 
    rpcUrl: "https://fullnode.mainnet.aptoslabs.com/v1",
    explorerUrl: "https://explorer.aptoslabs.com"
  }
};
