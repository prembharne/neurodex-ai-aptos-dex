module My_module::minimal_test {
    use std::signer;
    public entry fun hello(admin: &signer) {
        let a = signer::address_of(admin);
    }
}
