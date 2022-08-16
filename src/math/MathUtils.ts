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

export function isFuzzyInteger (i: number, eps: number) : boolean {
   return Math.abs(i - Math.round(i)) <= eps; }

/**
* Returns true if `x` is a power of 2 between 1 and 2^30.
*/
export function isPowerOf2 (i: number) : boolean {
   if (!Number.isSafeInteger(i) || i < 1 || i > 0x40000000) {
      return false; }
   return (i & (i - 1)) == 0; }                            // tslint:disable-line:no-bitwise

/**
* Returns the lowest power of 2 that is higher than `x`.
*/
export function getNextPowerOf2 (x: number) : number {
   if (!isFinite(x)) {
      return NaN; }
   let n = 1;
   while (n <= x) {
      n *= 2; }
   return n; }

/**
* Returns the same as `Math.floor(Math.log2(i))` for values in the range 1 .. 2^31-1,
* but without possibly occurring arithmetic problems with floating point numbers.
*/
export function floorLog2 (x: number) : number {
   if (x > 0x7FFFFFFF || x < 1) {
      throw new Error("Argument is not a valid integer."); }
   return 31 - Math.clz32(x); }

/**
* Calculates a hyperbolic decline factor.
* Harmonic and exponential decline are special cases of the hyperbolic decline.
* Linear decline is also a special case, but requires clipping to suppress negative values.
*
* @param t
*    The elapsed time.
* @param a
*    The initial decline rate.
*    This is the initial negative slope of the decline curve.
* @param b
*    The hyperbolic decline exponent constant.
*    1 for harmonic decline.
*    0 for exponential decline.
*    -1 for linear decline (with clipping to 0).
*    Between 0 and 1 for hyperbolic decline.
* @returns
*    The decline factor.
*/
export function hyperbolicDecline (t: number, a: number, b: number) : number {
   switch (b) {
      case 1: {                                            // harmonic decline
         return 1 / (1 + a * t); }
      case 0: {                                            // exponential decline
         return Math.exp(-a * t); }
      case -1: {                                           // linear decline with clipping to 0
         return Math.max(0, 1 - a * t); }
      default: {                                           // hyperbolic decline
         return 1 / (1 + b * a * t) ** (1 / b); }}}

/**
* Calculates a simple moving average over an array.
* Each element of the output array contains the mean value of the window centered at that position in the input array.
*/
export function movingAverage (a: ArrayLike<number>, windowWidth: number) : Float64Array {
   if (windowWidth < 2 || !Number.isSafeInteger(windowWidth)) {
      throw new Error("Specified window width is not a valid integer value."); }
   const len = a.length;
   const a2 = new Float64Array(len);
   const halfWindowWidth = Math.floor(windowWidth / 2);
   const extendedLen = len + halfWindowWidth;
   let movingSum = 0;                                      // sum of the array values within the moving window
   let n = 0;                                              // number of array values in movingSum
   for (let p = 0; p < extendedLen; p++) {
      if (p >= windowWidth) {
         movingSum -= a[p - windowWidth];                  // remove oldest value from moving sum
         n--; }
      if (p < len) {
         movingSum += a[p];                                // add new value to moving sum
         n++; }
      const p2 = p - halfWindowWidth;                      // center position of the window
      if (p2 >= 0) {
         a2[p2] = movingSum / n; }}                        // output value is average of moving sum
   return a2; }
