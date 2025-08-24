module My_module::liquidation_demo {
    use std::signer;
    use aptos_std::table::{Self as table, Table};

    /// Minimal position struct
    struct Position has copy, store, drop {
        size: u64,
        margin: u128,
        entry_px: u64,
    }

    /// Per-pair state
    struct PairState has key {
        pair_id: u64,
        positions: Table<address, Position>,
        mark_price: u64,
    }

    /// Initialize a pair
    public entry fun init_pair(admin: &signer, pair_id: u64, mark_px: u64) {
        let addr = signer::address_of(admin);
        move_to<PairState>(admin, PairState {
            pair_id,
            positions: table::new<address, Position>(),
            mark_price: mark_px,
        });
    }

    /// Set mark price
    public entry fun set_mark_price(admin: &signer, new_px: u64) acquires PairState {
        let addr = signer::address_of(admin);
        let st = borrow_global_mut<PairState>(addr);
        st.mark_price = new_px;
    }

    /// Open a position
    public entry fun open_position(admin: &signer, user: address, size: u64, margin: u128, entry_px: u64) acquires PairState {
        let addr = signer::address_of(admin);
        let st = borrow_global_mut<PairState>(addr);
        table::add(&mut st.positions, user, Position {
            size,
            margin,
            entry_px,
        });
    }

    /// Simple liquidation: remove position if margin < threshold
    public entry fun liquidate(admin: &signer, user: address, min_margin: u128) acquires PairState {
        let addr = signer::address_of(admin);
        let st = borrow_global_mut<PairState>(addr);
        if (table::contains(&st.positions, user)) {
            let pos = table::borrow(&st.positions, user);
            if (pos.margin < min_margin) {
                table::remove(&mut st.positions, user);
            }
        }
    }
}
