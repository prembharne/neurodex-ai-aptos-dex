// Aptos blockchain service for wallet integration
import { AptosClient, CoinClient } from "aptos";

class AptosService {
  constructor() {
    this.client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
    this.coinClient = new CoinClient(this.client);
    this.contractAddress = "0xaa7d8510c46f2a026d31d8e0a77394de9ac79c37547f4ecf4c4b8a5ff6c2f1d1";
  }

  // Connect to Petra wallet
  async connectWallet() {
    try {
      if (!window.aptos) {
        throw new Error("Petra wallet not installed. Please install Petra wallet extension.");
      }

      const response = await window.aptos.connect();
      console.log("Connected to wallet:", response);
      
      // Call our smart contract to register wallet connection
      await this.registerWalletConnection(response.address);
      
      return {
        success: true,
        address: response.address,
        publicKey: response.publicKey
      };
    } catch (error) {
      console.error("Wallet connection error:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get wallet balance from blockchain
  async getWalletBalance(address) {
    try {
      if (!address) {
        throw new Error("Wallet address is required");
      }

      // Get APT balance using CoinClient
      const balance = await this.coinClient.checkBalance(address);
      console.log(`Balance for ${address}:`, balance);

      // Call our smart contract view function to get tracked balance
      const contractBalance = await this.getContractWalletBalance(address);

      return {
        success: true,
        address: address,
        balance: balance.toString(),
        formattedBalance: this.formatAptBalance(balance),
        contractBalance: contractBalance
      };
    } catch (error) {
      console.error("Balance fetch error:", error);
      return {
        success: false,
        error: error.message,
        balance: "0"
      };
    }
  }

  // Call smart contract to register wallet connection
  async registerWalletConnection(address) {
    try {
      const payload = {
        type: "entry_function_payload",
        function: `${this.contractAddress}::simple_wallet::connect_wallet`,
        arguments: []
      };

      const response = await window.aptos.signAndSubmitTransaction(payload);
      console.log("Wallet connection registered:", response);
      return response;
    } catch (error) {
      console.error("Contract registration error:", error);
      return null;
    }
  }

  // Get wallet balance from smart contract
  async getContractWalletBalance(address) {
    try {
      const resources = await this.client.getAccountResources(address);
      const walletResource = resources.find(
        r => r.type === `${this.contractAddress}::simple_wallet::WalletInfo`
      );

      if (walletResource) {
        return walletResource.data.balance;
      }

      return "0";
    } catch (error) {
      console.error("Contract balance error:", error);
      return "0";
    }
  }

  // Format APT balance for display
  formatAptBalance(balance) {
    const aptAmount = parseFloat(balance) / 100000000; // APT has 8 decimals
    return aptAmount.toFixed(4) + " APT";
  }

  // Test wallet connection
  async testWalletConnection() {
    try {
      if (!window.aptos) {
        throw new Error("Petra wallet not found");
      }
      
      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      
      const account = await window.aptos.account();
      console.log('✅ Wallet test successful:', account);
      
      return {
        success: true,
        account
      };
    } catch (error) {
      console.error('❌ Wallet test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Transfer APT using native Aptos transfer (more reliable)
  async transferApt(recipient, amount) {
    try {
      console.log('🔄 Transfer APT called with:', { recipient, amount });
      
      // Ensure recipient address is properly formatted
      const cleanRecipient = recipient.startsWith('0x') ? recipient : `0x${recipient}`;
      
      // Convert amount to octas (APT has 8 decimal places)
      const octas = Math.floor(amount * 100000000);
      
      console.log('🔧 Processed values:', { cleanRecipient, octas, amount });
      
      // Use the simplest possible transaction payload format
      const transaction = {
        type: "entry_function_payload",
        function: "0x1::coin::transfer",
        type_arguments: ["0x1::aptos_coin::AptosCoin"],
        arguments: [cleanRecipient, octas.toString()]
      };

      console.log('📝 Transaction payload:', JSON.stringify(transaction, null, 2));
      
      // Ensure wallet is connected before transaction
      if (!window.aptos) {
        throw new Error("Petra wallet not found");
      }
      
      const isConnected = await window.aptos.isConnected();
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }
      
      console.log('🔐 Wallet is connected, submitting transaction...');
      
      const response = await window.aptos.signAndSubmitTransaction(transaction);
      console.log("✅ Transfer completed:", response);
      
      return {
        success: true,
        transactionHash: response.hash || response
      };
    } catch (error) {
      console.error("❌ Transfer error:", error);
      
      // Handle different error types
      if (error.code === 4001 || error.status === "Rejected") {
        return {
          success: false,
          error: 'Transaction was cancelled by user'
        };
      }
      
      if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
        return {
          success: false,
          error: 'Transaction was cancelled by user'
        };
      }
      
      if (error.message.includes('insufficient')) {
        return {
          success: false,
          error: 'Insufficient balance to complete transaction'
        };
      }
      
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  // Disconnect wallet
  async disconnectWallet() {
    try {
      await window.aptos.disconnect();
      return { success: true };
    } catch (error) {
      console.error("Disconnect error:", error);
      return { success: false, error: error.message };
    }
  }

  // Check if wallet is connected
  async isConnected() {
    try {
      return await window.aptos.isConnected();
    } catch {
      return false;
    }
  }

  // Get current account
  async getAccount() {
    try {
      return await window.aptos.account();
    } catch {
      return null;
    }
  }
}

export default new AptosService();
