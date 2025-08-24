// Address utilities
// Normalize an Aptos address to 0x + 64 hex chars by left-padding with zeros.
export function normalizeAptosAddress(addr) {
    if (!addr.startsWith('0x'))
        return addr; // let validation layer reject
    const hex = addr.slice(2).toLowerCase();
    if (hex.length === 64)
        return `0x${hex}`;
    if (hex.length < 64)
        return '0x' + hex.padStart(64, '0');
    return `0x${hex.slice(-64)}`; // truncate extra just in case
}
