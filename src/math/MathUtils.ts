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
   return (i & (i - 1)) == 0; }

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
* Calculates the simple moving average (SMA) over an array of numbers.
* Each element of the output array contains the mean value of the window centered at that position in the input array.
* When the window width is even, the `shift` parameter specifies whether the resulting position is 0.5 to the
* left (`shift` = `false`) or to the right (`shift` = `true`) of the window center.
* Edge cases are handled by cutting the rectangular moving window at the edge.
*/
export function simpleMovingAverage (a: ArrayLike<number>, windowWidth: number, shift = false) : Float64Array {
   if (windowWidth < 2 || !Number.isSafeInteger(windowWidth)) {
      throw new Error("Specified window width is not valid for SMA."); }
   const len = a.length;
   const a2 = new Float64Array(len);
   const halfWindowWidth = Math.floor(windowWidth / 2);
   const posShift = (shift && windowWidth % 2 == 0) ? 1 : 0;
   const extendedLen = len + halfWindowWidth;
   let movingSum = 0;                                      // sum of the array values within the moving window
   let n = 0;                                              // number of array values in movingSum
   for (let p = 0; p < extendedLen; p++) {                 // p is the position of the last value at the end of the current moving window
      if (p >= windowWidth) {
         movingSum -= a[p - windowWidth];                  // remove oldest value from moving sum
         n--; }
      if (p < len) {
         movingSum += a[p];                                // add new value to moving sum
         n++; }
      const p2 = p - halfWindowWidth + posShift;           // center position of the window
      if (p2 >= 0 && p2 < len) {
         a2[p2] = movingSum / n; }}                        // output value is average of moving sum
   return a2; }

/**
* Calculates the triangular moving average (TMA) over an array of numbers.
* Each element of the output array contains the triangular weighted value of the window
* centered at that position in the input array.
* Note that the elements at the border of the triangular window are not included.
* Due to the optimization and the cutting at the edges of the input array, the values at the edges of
* the output array are not the same as when calculated with triangularMovingAverageRef().
*/
export function triangularMovingAverage (a: ArrayLike<number>, windowWidth: number) : Float64Array {
   if (windowWidth < 4 || !Number.isSafeInteger(windowWidth)) {
      throw new Error("Specified window width is not valid for TMA."); }
   // The TMA is calculated by applying twice the SMA with half the window width.
   const w1 = Math.floor(windowWidth / 2);
   const w2 = windowWidth - w1;
   const a1 = simpleMovingAverage(a, w1);
   const a2 = simpleMovingAverage(a1, w2, true);
   return a2; }

/**
* Reference implementation of the triangular moving average (TMA).
*
* This a very slow reference implementation. It is used in the test module to verify the result of the
* optimized implementation.
*/
export function triangularMovingAverageRef (a: ArrayLike<number>, windowWidth: number) : Float64Array {
   if (windowWidth < 4 || !Number.isSafeInteger(windowWidth)) {
      throw new Error("Specified window width is not valid for TMA."); }
   const len = a.length;
   const a2 = new Float64Array(len);
   for (let p = 0; p < len; p++) {
      a2[p] = computeTriangularAverageAt(a, p, windowWidth); }
   return a2; }

// Computes the triangular average at a specified position in an array of numbers.
function computeTriangularAverageAt (a: ArrayLike<number>, p: number, windowWidth: number) : number {
   const len = a.length;
   const p1 = Math.max(0, Math.ceil(p - windowWidth / 2 + 0.1));
   const p2 = Math.min(len - 1, Math.floor(p + windowWidth / 2 - 0.1));
   let sum = 0;
   let weightSum = 0;
   for (let i = p1; i <= p2; i++) {
      const weight = 1 - Math.abs(i - p) / (windowWidth / 2);
      sum += a[i] * weight;
      weightSum += weight; }
   return sum / weightSum; }
