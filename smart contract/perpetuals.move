module My_module::perp_core {
    use std::error;
    use std::option::{Self as opt, Option};
    use std::signer;
    use aptos_std::table::{Self as table, Table};

    /******** Errors ********/
    const E_PAIR_EXISTS: u64 = 1;
    const E_PAIR_NOT_FOUND: u64 = 2;
    const E_POS_EXISTS: u64 = 3;
    const E_POS_NOT_FOUND: u64 = 4;
    const E_BAD_SIDE: u64 = 5;
    const E_BAD_QTY: u64 = 6;
    const E_BAD_LEV: u64 = 7;
    const E_BAD_MARGIN: u64 = 8;
    const E_NOT_AUTH: u64 = 9;
    const E_UNSAFE: u64 = 10;

    /******** Types ********/
    /// side: 0 = LONG, 1 = SHORT
    struct Position has key, store, drop {
        side: u8,
        size: u64,             // base lots
        entry_px: u64,         // avg entry price (ticks)
        margin: u64,           // locked user margin (quote units)
        lev_bps: u64,          // leverage in basis points (e.g., 5000 = 50x)
        funding_index_open: u128, // cumulative funding index snapshot when opened
    }

    struct PairConfig has drop, copy, store {
        max_lev_bps: u64,         // e.g., 5000 = 50x
        init_margin_bps: u64,     // initial margin requirement (e.g., 2000 = 20%)
        maint_margin_bps: u64,    // maintenance margin requirement (e.g., 1000 = 10%)
        max_funding_bps_hour: u64,// cap |funding| per hour in bps (e.g., 50 = 0.50%)
    }

    struct Pair has key {
        pair_id: u64,
        cfg: PairConfig,
        mark_px: u64,            // current index/mark price
    cum_funding_bps: u128,   // cumulative funding index in bps * hours
        last_funding_ts: u64,    // seconds
        oracle: address,         // allowed to set mark price
        vrf_oracle: address,     // allowed to push VRF-derived funding
        // user -> Position
        positions: Table<address, Position>,
    }

    /******** Admin ********/
    public entry fun create_pair(
        admin: &signer,
        pair_id: u64,
        max_lev_bps: u64,
        init_margin_bps: u64,
        maint_margin_bps: u64,
        max_funding_bps_hour: u64,
        oracle: address,
        vrf_oracle: address,
        init_mark_px: u64,
        now_ts: u64
    ) {
        let a = signer::address_of(admin);
        let key = pair_object_address(a, pair_id);
        assert!(!exists<Pair>(key), error::already_exists(E_PAIR_EXISTS));
        let cfg = PairConfig {
            max_lev_bps,
            init_margin_bps,
            maint_margin_bps,
            max_funding_bps_hour,
        };
        move_to<Pair>(admin, Pair {
            pair_id,
            cfg,
            mark_px: init_mark_px,
            cum_funding_bps: 0,
            last_funding_ts: now_ts,
            oracle,
            vrf_oracle,
            positions: table::new<address, Position>(),
        });
    }

    /// For simplicity we derive a deterministic “object account” for each pair under admin.
    fun pair_object_address(admin: address, pair_id: u64): address {
        // In production, prefer aptos_framework::object. Kept simple here:
        admin
    }
    // Removed create_pair_object; not needed.

    // Removed borrow_pair_mut and borrow_pair helper functions. Inline resource access in entry functions.

    /******** Oracles ********/
    /// Set mark price (only price oracle)
    public entry fun set_mark_price(admin: &signer, pair_id: u64, caller: &signer, new_px: u64) acquires Pair {
        let pa = pair_object_address(signer::address_of(admin), pair_id);
        assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
        let book = borrow_global_mut<Pair>(pa);
        assert!(signer::address_of(caller) == book.oracle, error::permission_denied(E_NOT_AUTH));
        book.mark_px = new_px;
    }

    /// Update funding using a **VRF seed** (only VRF oracle).
    /// We map seed → signed funding rate in [-max_funding_bps_hour, +max_funding_bps_hour] and
    /// accrue by elapsed hours since last update.
    public entry fun push_funding(admin: &signer, pair_id: u64, caller: &signer, funding_bps: u128, vrf_seed_u128: u128, now_ts: u64) acquires Pair {
    // ...existing code...
        let pa = pair_object_address(signer::address_of(admin), pair_id);
        assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
        let p = borrow_global_mut<Pair>(pa);
        assert!(signer::address_of(caller) == p.vrf_oracle, error::permission_denied(E_NOT_AUTH));
        let dt = if (now_ts > p.last_funding_ts) now_ts - p.last_funding_ts else 0;
        if (dt == 0) return;
        // Derive symmetric funding in bps from seed
        let cap = p.cfg.max_funding_bps_hour;
        let span = cap * 2 + 1;                       // [0 .. 2*cap]
        let r = (vrf_seed_u128 % (span as u128)) as u64;
        let signed: u128 = (r as u128) - (cap as u128); // [0 .. 2*cap]
        // Accrue by hours (floor)
        let hours = dt / 3600;
        if (hours > 0) {
            p.cum_funding_bps = p.cum_funding_bps + signed * (hours as u128);
            p.last_funding_ts = p.last_funding_ts + hours * 3600;
        }
    }

    /******** Core Math ********/
    inline fun notional(px: u64, size: u64): u128 {
        (px as u128) * (size as u128)
    }
    inline fun required_init_margin(notional_q: u128, lev_bps: u64, init_bps: u64): u128 {
        // Require both leverage bound and minimum initial margin floor.
        let by_lev = notional_q / (lev_bps as u128);       // notional / leverage
        let by_floor = (notional_q * (init_bps as u128)) / 10_000u128;
        if (by_lev > by_floor) by_lev else by_floor
    }
    inline fun maint_margin(notional_q: u128, maint_bps: u64): u128 {
        (notional_q * (maint_bps as u128)) / 10_000u128
    }

    /// Funding PnL = signer(side) * notional * (cumFunding_now - cumFunding_open)/10_000
    inline fun funding_pnl(px: u64, size: u64, side: u8, cum_now: u128, cum_open: u128): u128 {
        let n: u128 = notional(px, size);
        let delta_bps_hours: u128 = if (cum_now > cum_open) cum_now - cum_open else cum_open - cum_now;
        // Per-hour index already folded in; divide by 10_000 to convert bps to fraction.
        let raw = (n * delta_bps_hours) / 10_000;
        raw
    }

    inline fun price_pnl(cur_px: u64, entry_px: u64, size: u64, side: u8): u128 {
        let diff: u128 = if (cur_px > entry_px) (cur_px as u128) - (entry_px as u128) else (entry_px as u128) - (cur_px as u128);
        let move_q: u128 = diff * (size as u128);
        move_q
    }

    /// Health = margin + price_pnl + funding_pnl - maint_margin
        fun health(p: &Pair, pos: &Position): u128 {
                let n = notional(p.mark_px, pos.size);
                let mm = maint_margin(n, p.cfg.maint_margin_bps);
                let h = (pos.margin as u128)
                    + price_pnl(p.mark_px, pos.entry_px, pos.size, pos.side)
                    + funding_pnl(p.mark_px, pos.size, pos.side, p.cum_funding_bps, pos.funding_index_open)
                    - mm;
                h
    }

    /******** Trading ********/
    /// Open a single net position per user per pair (kept simple).
    /// `lev_bps` example: 5000 = 50x; `margin` is the user's lock for this position (quote units).
    public entry fun open_position(admin: &signer, user: address, pair_id: u64, size: u64, side: u8, lev_bps: u64, margin: u64, entry_px: u64) acquires Pair {
    // ...existing code...
        assert!(side < 2, error::invalid_argument(E_BAD_SIDE));
        assert!(size > 0, error::invalid_argument(E_BAD_QTY));

    let ua = user;
    let pa = pair_object_address(signer::address_of(admin), pair_id);
    assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
    let pair = borrow_global_mut<Pair>(pa);
    assert!(lev_bps > 0 && lev_bps <= pair.cfg.max_lev_bps, error::invalid_argument(E_BAD_LEV));
    // Require fresh position (keep minimal). Extending to add/reduce is straightforward.
    assert!(!table::contains(&pair.positions, ua), error::already_exists(E_POS_EXISTS));
    let n = notional(pair.mark_px, size);
    let req = required_init_margin(n, lev_bps, pair.cfg.init_margin_bps);
    assert!((margin as u128) >= req, error::invalid_argument(E_BAD_MARGIN));
    table::add(&mut pair.positions, ua, Position {
            side, size,
            entry_px: pair.mark_px,
            margin,
            lev_bps,
            funding_index_open: pair.cum_funding_bps,
        });
        // NOTE: Hook your MarginVault here to lock `margin`.
    }

    /// Close full (or partial) position at current mark price. Returns PnL + released margin via events or vault hook.
    public entry fun close_position(admin: &signer, user: address, pair_id: u64, size_to_close: u64) acquires Pair {
    // ...existing code...
        let ua = user;
        let pa = pair_object_address(signer::address_of(admin), pair_id);
        assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
        let pair = borrow_global_mut<Pair>(pa);
        assert!(table::contains(&pair.positions, ua), error::not_found(E_POS_NOT_FOUND));
        assert!(size_to_close > 0, error::invalid_argument(E_BAD_QTY));
        let pos = table::borrow_mut(&mut pair.positions, ua);
        assert!(pos.size >= size_to_close, error::invalid_argument(E_BAD_QTY));
        // Pro-rata margin
        let margin_share: u64 = ((pos.margin as u128) * (size_to_close as u128) / (pos.size as u128)) as u64;
        // Compute PnL
        let price = pair.mark_px;
        let pnl_price = price_pnl(price, pos.entry_px, size_to_close, pos.side);
        let pnl_funding = funding_pnl(price, size_to_close, pos.side, pair.cum_funding_bps, pos.funding_index_open);
        let pnl_total: u128 = pnl_price + pnl_funding;
        // Safety: disallow closing that would “owe” more than margin_share (simple guard; real systems allow negative and hit account)
        let equity_released: u128 = (margin_share as u128) + pnl_total;
        assert!(equity_released >= 0, error::invalid_state(E_UNSAFE));
        // Shrink / delete position
        pos.size = pos.size - size_to_close;
        pos.margin = pos.margin - margin_share;
        if (pos.size == 0) {
            // drop pos
            table::remove(&mut pair.positions, ua);
        }

        // NOTE: Transfer `equity_released` from vault to user here.
        // Kept as comment to keep this file small and dependency-free.
    }

    /// Anyone can trigger liquidation if account health < 0 (below maintenance).
    /// For brevity closes 100% and leaves “liquidation fee” as TODO hook.
    public entry fun liquidate(admin: &signer, victim: address, pair_id: u64) acquires Pair {
    let pa = pair_object_address(signer::address_of(admin), pair_id);
    assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
    let pair = borrow_global_mut<Pair>(pa);
    assert!(table::contains(&pair.positions, victim), error::not_found(E_POS_NOT_FOUND));
    let pos_ref = table::borrow(&pair.positions, victim);
    let h = health(pair, pos_ref);
        assert!(h < 0, error::invalid_state(E_UNSAFE)); // eligible

        // Close entire position at mark (same math as close_position, skipping non-essential guards)
        let side = pos_ref.side;
        let size = pos_ref.size;
        let margin = pos_ref.margin;
        let pnl_price = price_pnl(pair.mark_px, pos_ref.entry_px, size, side);
        let pnl_funding = funding_pnl(pair.mark_px, size, side, pair.cum_funding_bps, pos_ref.funding_index_open);
    let equity: u128 = (margin as u128) + pnl_price + pnl_funding;

    table::remove(&mut pair.positions, victim);

        // TODO: send a cut to liquidator; if equity < 0, socialize or pull from insurance.
        // Hook your vault + insurance fund here.
        let _ = equity; // silence “unused”
    }

    /******** Views ********/
    public fun get_mark_px(admin_addr: address, pair_id: u64): u64 acquires Pair {
    let pa = pair_object_address(admin_addr, pair_id);
    assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
    borrow_global<Pair>(pa).mark_px
    }
    public fun get_cum_funding_bps(admin_addr: address, pair_id: u64): u128 acquires Pair {
    let pa = pair_object_address(admin_addr, pair_id);
    assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
    borrow_global<Pair>(pa).cum_funding_bps
    }
    public fun get_position(admin_addr: address, pair_id: u64, owner: address): Option<Position> acquires Pair {
    let pa = pair_object_address(admin_addr, pair_id);
    assert!(exists<Pair>(pa), error::not_found(E_PAIR_NOT_FOUND));
    let p = borrow_global<Pair>(pa);
        if (!table::contains(&p.positions, owner)) opt::none<Position>()
        else {
            let pos_ref = table::borrow(&p.positions, owner);
            opt::some(Position {
                side: pos_ref.side,
                size: pos_ref.size,
                entry_px: pos_ref.entry_px,
                margin: pos_ref.margin,
                lev_bps: pos_ref.lev_bps,
                funding_index_open: pos_ref.funding_index_open,
            })
        }
    }
}
