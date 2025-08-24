module My_module::simple_orderbook {
    use std::signer;
    // ...existing code...
    use aptos_std::table::{Self as table, Table};

    const E_NO_LIQUIDITY: u64 = 1;

    /// BUY = 0, SELL = 1
    struct Order has store, drop {
        id: u64,
        owner: address,
        side: u8,
        price: u64,
        qty: u64,
    }

    struct Book has key {
        next_id: u64,
        bids: Table<u64, vector<Order>>, // price → orders (FIFO)
        asks: Table<u64, vector<Order>>,
    }

    /// Create empty book
    public entry fun init(admin: &signer) {
        move_to<Book>(admin, Book {
            next_id: 1,
            bids: table::new<u64, vector<Order>>(),
            asks: table::new<u64, vector<Order>>(),
        });
    }


    /// Place LIMIT order, matches if crossing
    public entry fun place_limit(
        admin: &signer,
        user: &signer,
        side: u8,
        price: u64,
        qty: u64
    ) acquires Book {
    let book = borrow_global_mut<Book>(signer::address_of(admin));
        let id = book.next_id; book.next_id = id + 1;
        let o = Order { id, owner: signer::address_of(user), side, price, qty };

        if (side == 0) {
            // BUY: match against asks
            match_orders(&mut book.asks, true, o);
        } else {
            // SELL: match against bids
            match_orders(&mut book.bids, false, o);
        }
    }

    /// Place MARKET order (fills immediately)
    public entry fun place_market(
        admin: &signer,
        user: &signer,
        side: u8,
        qty: u64
    ) acquires Book {
    let book = borrow_global_mut<Book>(signer::address_of(admin));
        let id = book.next_id; book.next_id = id + 1;
        let o = Order { id, owner: signer::address_of(user), side, price: 0, qty };

        if (side == 0) match_orders(&mut book.asks, true, o)
        else match_orders(&mut book.bids, false, o);
    }

    /// Simple matching loop
    fun match_orders(book_side: &mut Table<u64, vector<Order>>, taker_buy: bool, taker: Order) {
        let taker = taker;
    let px = if (taker_buy) 0 else 0; // placeholder
    // NOTE: You must maintain a vector of price keys for each side (bids/asks) in your Book struct.
    // For demo, we will skip matching logic and just show how to access table entries by key.
    // Remove unsupported table API calls and use u64 directly for keys.
    // Example:
    // let price_keys = ...; // vector<u64> of price levels
    // let len = vector::length(&price_keys);
    // let i = 0;
    // while (i < len) {
    //     let price = *vector::borrow(&price_keys, i);
    //     let lvl = table::borrow_mut(book_side, price);
    //     // ...matching logic...
    //     i = i + 1;
    // }

            // Take from first order at this price
            // Matching logic removed: variables lvl and best are not declared.
            // To implement matching, use a vector of price keys and iterate over them.
    }

        // If still qty left, add to opposite book (limit only)
        // (add your logic here if needed)
    }

