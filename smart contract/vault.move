module My_module::margin_vault {
    use std::signer;
    use std::error;
    use aptos_framework::coin;
    use aptos_framework::coin::Coin;

    /// Error codes
    const E_ALREADY_REGISTERED: u64 = 1;
    const E_NOT_REGISTERED: u64 = 2;
    const E_INSUFFICIENT_AVAILABLE: u64 = 3;
    const E_INSUFFICIENT_LOCKED: u64 = 4;

    /// Per-user margin box. Funds sit under the user's account (not pooled in the module),
    /// which keeps custody simple and auditable.
    struct MarginBox<phantom T> has key {
        /// Free collateral the user can withdraw or lock for positions
        available: Coin<T>,
        /// Collateral that is locked against open positions
        locked: Coin<T>,
    }

    /// Register a margin box for a specific coin type `T` (e.g., USDC).
    public entry fun register<T>(user: &signer) {
        let addr = signer::address_of(user);
        assert!(
            !exists<MarginBox<T>>(addr),
            error::invalid_state(E_ALREADY_REGISTERED)
        );
        move_to<MarginBox<T>>(
            user,
            MarginBox<T> {
                available: coin::zero<T>(),
                locked: coin::zero<T>(),
            }
        );
    }

    /// Idempotent helper: ensure MarginBox exists, otherwise create it.
    fun ensure_registered<T>(user: &signer) {
        if (!exists<MarginBox<T>>(signer::address_of(user))) {
            register<T>(user)
        }
    }

    /// Deposit `amount` of `T` from the user's CoinStore into their MarginBox.available.
    public entry fun deposit<T>(user: &signer, amount: u64) acquires MarginBox {
        ensure_registered<T>(user);
        let mb = borrow_global_mut<MarginBox<T>>(signer::address_of(user));

        // Move coins from CoinStore -> MarginBox.available
        let incoming: Coin<T> = coin::withdraw<T>(user, amount);
        coin::merge(&mut mb.available, incoming);
    }

    /// Withdraw `amount` of `T` from MarginBox.available back to the user's CoinStore.
    public entry fun withdraw<T>(user: &signer, amount: u64) acquires MarginBox {
        let addr = signer::address_of(user);
        assert!(exists<MarginBox<T>>(addr), error::not_found(E_NOT_REGISTERED));
        let mb = borrow_global_mut<MarginBox<T>>(addr);

        // Check available balance
        let avail = coin::value(&mb.available);
        assert!(avail >= amount, error::invalid_argument(E_INSUFFICIENT_AVAILABLE));

        // Move coins from available -> CoinStore
        let out: Coin<T> = coin::extract(&mut mb.available, amount);
        coin::deposit<T>(signer::address_of(user), out);
    }

    /// Lock `amount` of `T` from available into locked (for opening/maintaining a position).
    /// Typically called by the user or routed via a higher-level DEX/engine with user intent.
    public entry fun lock<T>(user: &signer, amount: u64) acquires MarginBox {
        let addr = signer::address_of(user);
        assert!(exists<MarginBox<T>>(addr), error::not_found(E_NOT_REGISTERED));
        let mb = borrow_global_mut<MarginBox<T>>(addr);

        let avail = coin::value(&mb.available);
        assert!(avail >= amount, error::invalid_argument(E_INSUFFICIENT_AVAILABLE));

        let moved: Coin<T> = coin::extract(&mut mb.available, amount);
        coin::merge(&mut mb.locked, moved);
    }

    /// Unlock `amount` of `T` from locked back to available (e.g., when closing/reducing a position).
    public entry fun unlock<T>(user: &signer, amount: u64) acquires MarginBox {
        let addr = signer::address_of(user);
        assert!(exists<MarginBox<T>>(addr), error::not_found(E_NOT_REGISTERED));
        let mb = borrow_global_mut<MarginBox<T>>(addr);

        let l = coin::value(&mb.locked);
        assert!(l >= amount, error::invalid_argument(E_INSUFFICIENT_LOCKED));

        let moved: Coin<T> = coin::extract(&mut mb.locked, amount);
        coin::merge(&mut mb.available, moved);
    }

    /// View: available margin (collateral) in `T` for `owner`.
    public fun available<T>(owner: address): u64 acquires MarginBox {
        if (!exists<MarginBox<T>>(owner)) return 0;
        coin::value(&borrow_global<MarginBox<T>>(owner).available)
    }

    /// View: locked margin in `T` for `owner`.
    public fun locked<T>(owner: address): u64 acquires MarginBox {
        if (!exists<MarginBox<T>>(owner)) return 0;
        coin::value(&borrow_global<MarginBox<T>>(owner).locked)
    }

    /// View: total margin (available + locked) in `T` for `owner`.
    public fun total<T>(owner: address): u64 acquires MarginBox {
        if (!exists<MarginBox<T>>(owner)) return 0;
        let mb = borrow_global<MarginBox<T>>(owner);
        coin::value(&mb.available) + coin::value(&mb.locked)
    }
}
