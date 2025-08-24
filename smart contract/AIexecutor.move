module My_module::ai_bridge {
    use std::signer;
    use std::vector;
    // ...existing code...

        /// Errors
        const E_NOT_ADMIN: u64 = 1;
        const E_INVALID_MARGIN: u64 = 2;
        const E_INVALID_LEVERAGE: u64 = 3;
        const E_INVALID_PAIR: u64 = 4;

        /// AI Trade Instruction
        struct TradeInstruction has copy, drop, store {
            user: address,
            pair: vector<u8>,   // e.g. "BTC/USDT"
            side: bool,         // true = long, false = short
            leverage: u64,
            margin: u64,
            timestamp: u64,
        }

        /// Store all executed AI trades
        struct TradeLog has key {
            trades: vector<TradeInstruction>,
        }

        /// Bridge admin (trusted backend AI signer)
        struct Bridge has key {
            admin: address,
            max_leverage: u64,
            min_margin: u64,
        }

        /// Trade event
        struct TradeEvent has copy, drop, store {
            trade: TradeInstruction,
        }

        /// Initialize AI bridge (admin only)
        public entry fun init(admin: &signer, max_leverage: u64, min_margin: u64) {
            let b = Bridge {
                admin: signer::address_of(admin),
                max_leverage,
                min_margin,
            };
            move_to(admin, b);

            let log = TradeLog {
                trades: vector::empty<TradeInstruction>(),
            };
            move_to(admin, log);
        }

        /// Admin can update parameters
        public entry fun set_params(admin: &signer, max_leverage: u64, min_margin: u64) acquires Bridge {
            let b = borrow_global_mut<Bridge>(signer::address_of(admin));
            assert!(signer::address_of(admin) == b.admin, E_NOT_ADMIN);
            b.max_leverage = max_leverage;
            b.min_margin = min_margin;
        }

        /// User submits their own trade (requires user signature)
        public entry fun submit_ai_trade(
            user: &signer,
            pair: vector<u8>,
            side: bool,
            leverage: u64,
            margin: u64,
            timestamp: u64
        ) acquires Bridge, TradeLog {
            let addr = signer::address_of(user);
            let b = borrow_global<Bridge>(addr);

            // ---- SAFETY CHECKS ----
            assert!(margin >= b.min_margin, E_INVALID_MARGIN);
            assert!(leverage <= b.max_leverage, E_INVALID_LEVERAGE);
            assert!(vector::length(&pair) > 0, E_INVALID_PAIR);

            let trade = TradeInstruction {
                user: addr, pair, side, leverage, margin, timestamp
            };

            // log on-chain
            let log = borrow_global_mut<TradeLog>(addr);
            vector::push_back(&mut log.trades, trade);
        }

        /// View all logged trades
        public fun get_trades(addr: address): vector<TradeInstruction> acquires TradeLog {
            let log = borrow_global<TradeLog>(addr);
            log.trades
        }
}
