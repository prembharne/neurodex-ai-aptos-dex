module My_module::governance {
    use std::signer;
    use aptos_std::table::{Self as table, Table};

    /// Errors
    const E_NOT_ADMIN: u64 = 1;
    const E_NO_PERMISSION: u64 = 2;

    /// System parameters controlled by governance
    struct Params has key, store {
        max_leverage: u64,
        fee_bps: u64, // basis points = fee%
    }

    /// Governance resource (admin + optional voters)
    struct Governance has key {
        admin: address,
        params: Params,
        votes: Table<address, u64>, // token holders’ voting power
    }

    /// Initialize governance with admin
    public entry fun init(admin: &signer, max_leverage: u64, fee_bps: u64) {
        let gov = Governance {
            admin: signer::address_of(admin),
            params: Params { max_leverage, fee_bps },
            votes: table::new<address, u64>(),
        };
        move_to(admin, gov);
    }



    /// ---- ADMIN FUNCTIONS ----

    public entry fun set_params(admin: &signer, max_leverage: u64, fee_bps: u64) acquires Governance {
        let gov = borrow_global_mut<Governance>(signer::address_of(admin));
        assert!(signer::address_of(admin) == gov.admin, E_NOT_ADMIN);
        gov.params.max_leverage = max_leverage;
        gov.params.fee_bps = fee_bps;
    }

    public entry fun transfer_admin(admin: &signer, new_admin: address) acquires Governance {
        let gov = borrow_global_mut<Governance>(signer::address_of(admin));
        assert!(signer::address_of(admin) == gov.admin, E_NOT_ADMIN);
        gov.admin = new_admin;
    }

    /// ---- OPTIONAL TOKEN VOTING ----

    /// Give voting power (admin controlled, could be tied to governance token)
    public entry fun assign_votes(admin: &signer, user: address, power: u64) acquires Governance {
        let gov = borrow_global_mut<Governance>(signer::address_of(admin));
        assert!(signer::address_of(admin) == gov.admin, E_NOT_ADMIN);
        table::add(&mut gov.votes, user, power);
    }

    /// Simple majority vote to change params
    public entry fun vote_change(user: &signer, max_leverage: u64, fee_bps: u64) acquires Governance {
        let gov = borrow_global_mut<Governance>(signer::address_of(user));
        let addr = signer::address_of(user);
        assert!(table::contains(&gov.votes, addr), E_NO_PERMISSION);

        // In a real system: accumulate votes, require >50% total
        // For demo: if user has voting power, allow direct update
        gov.params.max_leverage = max_leverage;
        gov.params.fee_bps = fee_bps;
    }

    /// View function
    public fun get_params(addr: address): (u64, u64) acquires Governance {
        let gov = borrow_global<Governance>(addr);
        (gov.params.max_leverage, gov.params.fee_bps)
    }
}
