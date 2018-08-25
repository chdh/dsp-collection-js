export function fuzzyEquals (a: number, b: number, eps: number) : boolean {
   if (!isFinite(a) || !isFinite(b)) {
      return false; }
   if (a == b) {
      return true; }
   const diff = Math.abs(a - b);
   if (diff <= eps) {
      return true; }
   const mag = Math.max(Math.abs(a), Math.abs(b));
   return diff <= mag * eps; }

// Returns true if `x` is a power of 2 between 1 and 2^30.
export function isPowerOf2 (i: number) : boolean {
   if (!Number.isSafeInteger(i) || i < 1 || i > 0x40000000) {
      return false; }
   return (i & (i - 1)) == 0; }
