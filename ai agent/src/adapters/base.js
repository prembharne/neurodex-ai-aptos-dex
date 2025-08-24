export function isTransfer(i) { return i.type === 'TRANSFER'; }
export function isSwap(i) { return i.type === 'SWAP'; }
// Lightweight decimal -> atomic units converter (avoids bringing big decimal lib for now)
export function toAtomicUnits(amount, decimals) {
    if (!/^\d+(?:\.\d+)?$/.test(amount))
        throw new Error('Invalid decimal amount');
    const [whole, frac = ''] = amount.split('.');
    if (frac.length > decimals)
        throw new Error(`Too many decimal places (max ${decimals})`);
    const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
    return BigInt(whole) * BigInt(10 ** decimals) + BigInt(padded);
}
