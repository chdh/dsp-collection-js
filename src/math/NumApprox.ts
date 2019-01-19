// Routines for numerical approximation and optimization.

/**
* Searches for the argument of a function maximum by using an arithmetic progression for the arguments.
* It uses additive growth of the argument.
*
* @param f
*    An univariate numeric function.
* @param argLo
*    Lower range limit for the arguments. Start value for the scan.
* @param argHi
*    Upper range limit for the arguments. Stop value for the scan.
* @param argIncr
*    Additive increment for the arguments. Step size.
* @returns
*    The first argument that produces the maximum function value, or NaN.
*/
export function argMax_scanArith (f: (x: number) => number, argLo: number, argHi: number, argIncr: number) : number {
   let maxArg: number = NaN;
   let maxVal: number = -Infinity;
   let lastArg: number = NaN;
   for (let x = argLo; x < argHi; x += argIncr) {
      const v = f(x);
      if (v > maxVal) {
         maxArg = x;
         maxVal = v; }
      lastArg = x; }
   if (lastArg != argHi && argHi > argLo && f(argHi) > maxVal) {
      maxArg = argHi; }
   return maxArg; }

/**
* Searches for the argument of a function maximum by using a geometric progression for the arguments.
* It uses multiplicative growth of the argument.
*
* @param f
*    An univariate numeric function.
* @param argLo
*    Lower range limit for the arguments. Start value for the scan.
* @param argHi
*    Upper range limit for the arguments. Stop value for the scan.
* @param argFactor
*    Multiplicative increase factor for the arguments.
* @returns
*    The first argument that produces the maximum function value, or NaN.
*/
export function argMax_scanGeom (f: (x: number) => number, argLo: number, argHi: number, argFactor: number) : number {
   let maxArg: number = NaN;
   let maxVal: number = -Infinity;
   let lastArg: number = NaN;
   for (let x = argLo; x < argHi; x *= argFactor) {
      const v = f(x);
      if (v > maxVal) {
         maxArg = x;
         maxVal = v; }
      lastArg = x; }
   if (lastArg != argHi && argHi > argLo && f(argHi) > maxVal) {
      maxArg = argHi; }
   return maxArg; }

/**
* Searches for the argument of a function maximum by using golden-section search.
* The passed function should be strictly unimodal within the specified argument range.
*
* @param f
*    An univariate numeric function.
* @param argLo
*    Lower range limit for the function argument.
* @param argHi
*    Upper range limit for the function argument.
* @param tolerance
*    Allowed approximation error for the result.
* @returns
*    The argument that produces the maximum function value.
*/
export function argMax_goldenSectionSearch (f: (x: number) => number, argLo: number, argHi: number, tolerance: number) : number {
   const invPhi  = (Math.sqrt(5) - 1) / 2;                 // inverse golden ratio
   const invPhi2 = 1 - invPhi;                             // = invPhi ** 2
   let lo = argLo;                                         // lower range limit
   let hi = argHi;                                         // upper range limit
   let width = hi - lo;                                    // current range width
   let x1 = lo + width * invPhi2;                          // left candidate
   let x2 = lo + width * invPhi;                           // right candidate
   let y1 = f(x1);                                         // function value at left candidate
   let y2 = f(x2);                                         // function value at right candidate
   if (width <= tolerance) {
      return (lo + hi) / 2; }
   const n = Math.ceil(Math.log(tolerance / width) / Math.log(invPhi)); // number of iterations
   for (let i = 0; i < n; i++) {
      width *= invPhi;                                     // each iteration improves the approximation by the golden ratio
      if (y1 >= y2) {                                      // maximum is left
         hi = x2;                                          // old right candidate is new upper range limit
         x2 = x1;
         y2 = y1;
         x1 = lo + width * invPhi2;
         y1 = f(x1); }
       else {                                              // maximum is right
         lo = x1;                                          // old left candidate is new lower range limit
         x1 = x2;
         y1 = y2;
         x2 = lo + width * invPhi;
         y2 = f(x2); }}
   return (y1 >= y2) ? (lo + x2) / 2 : (x1 + hi) / 2; }
