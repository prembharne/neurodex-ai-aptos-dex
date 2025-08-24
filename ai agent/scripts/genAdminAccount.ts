import { Account } from '@aptos-labs/ts-sdk';

// Simple script to generate a new deployer/admin account keypair
// Usage: npm run gen:admin
// NOTE: Store the private key securely; do NOT commit real secrets.

function main() {
  const acct = Account.generate();
  console.log('Deployer / Admin Account Generated');
  console.log('Address:', acct.accountAddress.toString());
  console.log('Public Key:', acct.publicKey.toString());
  console.log('Private Key (hex):', acct.privateKey.toString());
  console.log('\nAdd to your .env if you want backend signing:');
  console.log('ADMIN_PRIVATE_KEY="' + acct.privateKey.toString() + '"');
}

main();
