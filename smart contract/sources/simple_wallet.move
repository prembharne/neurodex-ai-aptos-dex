module neurodex::simple_wallet {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};

    // Events
    struct WalletConnectedEvent has drop, store {
        user_address: address,
        apt_balance: u64,
        timestamp: u64,
    }

    // User wallet data
    struct WalletData has key {
        owner: address,
        apt_balance: u64,
        last_updated: u64,
        wallet_connected_events: EventHandle<WalletConnectedEvent>,
    }

    // Connect wallet and track balance
    public entry fun connect_wallet(user: &signer) acquires WalletData {
        let user_addr = signer::address_of(user);
        let current_balance = coin::balance<AptosCoin>(user_addr);
        let current_timestamp = aptos_framework::timestamp::now_seconds();

        // Initialize user wallet data if not exists
        if (!exists<WalletData>(user_addr)) {
            move_to(user, WalletData {
                owner: user_addr,
                apt_balance: current_balance,
                last_updated: current_timestamp,
                wallet_connected_events: account::new_event_handle<WalletConnectedEvent>(user),
            });
        } else {
            // Update existing data
            let wallet_data = borrow_global_mut<WalletData>(user_addr);
            wallet_data.apt_balance = current_balance;
            wallet_data.last_updated = current_timestamp;
        };

        // Emit wallet connected event
        let wallet_data = borrow_global_mut<WalletData>(user_addr);
        event::emit_event(&mut wallet_data.wallet_connected_events, WalletConnectedEvent {
            user_address: user_addr,
            apt_balance: current_balance,
            timestamp: current_timestamp,
        });
    }

    // Get wallet balance
    #[view]
    public fun get_wallet_balance(user_addr: address): u64 {
        coin::balance<AptosCoin>(user_addr)
    }

    // Get wallet info
    #[view]
    public fun get_wallet_info(user_addr: address): (u64, u64) acquires WalletData {
        let current_balance = coin::balance<AptosCoin>(user_addr);
        if (exists<WalletData>(user_addr)) {
            let wallet_data = borrow_global<WalletData>(user_addr);
            (current_balance, wallet_data.last_updated)
        } else {
            (current_balance, 0)
        }
    }

    // Simple transfer with tracking
    public entry fun transfer_apt(sender: &signer, recipient: address, amount: u64) {
        coin::transfer<AptosCoin>(sender, recipient, amount);
    }
}
