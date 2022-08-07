/**
* Utility routines for real polynomials and fractions of real polynomials.
*
* Polynomial coefficients are stored in arrays ordered in ascending powers.
* The associated polynomial has the form:
*    a[0]  +  a[1] * x  +  a[2] * x^2  +  ...  + a[n-1] * x^(n-1)  +  a[n] * x^n
*
* An empty array is not allowed. The real number zero ist represented by [0].
*
* For rational algebraic fractions, the coefficients are stored in nested arrays:
*    [top, bottom]
* The associated rational fraction has the form:
*    ( top[0]     +  top[1]    * x  +  top[2]    * x^2  +  ...  top[n-1]    * x^(n-1)  +  top[n]    * x^n ) /
*    ( bottom[0]  +  bottom[1] * x  +  bottom[2] * x^2  +  ...  bottom[m-1] * x^(m-1)  +  bottom[m] * x^m )
*/

import Complex from "./Complex.js";
import MutableComplex from "./MutableComplex.js";

/**
* Evaluates a real polynomial with a real argument.
*
* @param a
*   The coefficients of the polynomial, ordered in ascending powers.
* @param x
*   The x value for which the polynomial is to be evaluated.
* @returns
*   The value of the polynomial.
*/
export function evaluateReal (a: ArrayLike<number>, x: number) : number {
   if (a.length == 0) {
      throw new Error("Zero length array."); }
   const n = a.length - 1;
   let r = a[n];
   for (let i = n - 1; i >= 0; i--) {
      r *= x;
      r += a[i]; }
   return r; }

/**
* Evaluates a real polynomial with a complex argument.
*
* @param a
*   The coefficients of the polynomial, ordered in ascending powers.
* @param x
*   The x value for which the polynomial is to be evaluated.
* @returns
*   The value of the polynomial.
*/
export function evaluateComplex (a: ArrayLike<number>, x: Complex) : Complex {
   if (a.length == 0) {
      throw new Error("Zero length array."); }
   const n = a.length - 1;
   const r = new MutableComplex(a[n]);
   for (let i = n - 1; i >= 0; i--) {
      r.mulBy(x);
      r.addRealTo(a[i]); }
   return r; }

/**
* Computes the coefficients of a polynomial from it's real zeros.
*/
export function expand (zeros: ArrayLike<number>) : Float64Array {
   const n = zeros.length;
   if (n == 0) {
      return Float64Array.of(1); }
   let a = Float64Array.of(-zeros[0], 1);                  // start with (x - zeros[0])
   for (let i = 1; i < n; i++) {
      const a2 = Float64Array.of(-zeros[i], 1);
      a = multiply(a, a2); }                               // multiply factor (x - zeros[i]) into coefficients
   return a; }

/**
* Returns `true` if two polynomials are equal.
*/
export function compareEqual (a1: ArrayLike<number>, a2: ArrayLike<number>, eps = 0) : boolean {
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n = Math.max(n1, n2);
   for (let i = 0; i <= n; i++) {
      const v1 = (i <= n1) ? a1[i] : 0;
      const v2 = (i <= n2) ? a2[i] : 0;
      if (Math.abs(v1 - v2) > eps) {
         return false; }}
   return true; }

/**
* Adds two real polynomials.
*/
export function add (a1: ArrayLike<number>, a2: ArrayLike<number>, eps = 0) : Float64Array {
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n3 = Math.max(n1, n2);
   const a3 = new Float64Array(n3 + 1);
   for (let i = 0; i <= n3; i++) {
      const v1 = (i <= n1) ? a1[i] : 0;
      const v2 = (i <= n2) ? a2[i] : 0;
      a3[i] = v1 + v2; }
   return trim(a3, eps); }

/**
* Multiplies two real polynomials.
*/
export function multiply (a1: ArrayLike<number>, a2: ArrayLike<number>, eps = 0) : Float64Array {
   if (a1.length == 0 || a2.length == 0) {
      throw new Error("Zero length arrays."); }
   if (a1.length == 1 && a1[0] == 0 || a2.length == 1 && a2[0] == 0) {
      return Float64Array.of(0); }
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n3 = n1 + n2;
   const a3 = new Float64Array(n3 + 1);
   for (let i = 0; i <= n3; i++) {
      let t = 0;
      const p1 = Math.max(0, i - n2);
      const p2 = Math.min(n1, i);
      for (let j = p1; j <= p2; j++) {
         t += a1[j] * a2[i - j]; }
      a3[i] = t; }
   return trim(a3, eps); }

/**
* Divides two real polynomials.
* Returns [quotient, remainder] = [a1 / a2, a1 % a2].
*/
export function divide (a1r: ArrayLike<number>, a2r: ArrayLike<number>, eps = 0) : Float64Array[] {
   if (a1r.length == 0 || a2r.length == 0) {
      throw new Error("Zero length arrays."); }
   const a1 = trim(a1r, eps);
   const a2 = trim(a2r, eps);
   if (a2.length == 1) {
      if (a2[0] == 0) {
         throw new Error("Polynomial division by zero."); }
      if (a2[0] == 1) {
         return [Float64Array.from(a1), Float64Array.of(0)]; }
      return [divByReal(a1, a2[0]), Float64Array.of(0)]; }
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   if (n1 < n2) {
      return [Float64Array.of(0), Float64Array.from(a1)]; }
   const a = Float64Array.from(a1);
   const lc2 = a2[n2];                                     // leading coefficient of a2
   for (let i = n1 - n2; i >= 0; i--) {
      const r = a[n2 + i] / lc2;
      a[n2 + i] = r;
      for (let j = 0; j < n2; ++j) {
         a[i + j] -= r * a2[j]; }}
   const quotient = trim(a.subarray(n2), eps);
   const remainder = trim(a.subarray(0, n2), eps);
   return [quotient, remainder]; }

/**
* Returns the monic GCD (greatest common divisor) of two polynomials.
*/
export function gcd (a1: ArrayLike<number>, a2: ArrayLike<number>, eps = 0) : Float64Array {
   let r1 = trim(a1, eps);
   let r2 = trim(a2, eps);
   makeMonic(r1);
   makeMonic(r2);
   if (r1.length < r2.length) {
      [r1, r2] = [r2, r1]; }
   while (true) {
      if (r2.length < 2) {
         return Float64Array.of(1); }                      // GCD is 1
      const r = divide(r1, r2, eps)[1];
      if (r.length == 1 && r[0] == 0) {
         return r2; }
      makeMonic(r);
      r1 = r2;
      r2 = r; }}

// Trims top order zero coefficients.
function trim (a: ArrayLike<number>, eps = 0) : Float64Array {
   if (a.length == 0) {
      throw new Error("Zero length array."); }
   if (Math.abs(a[a.length - 1]) > eps) {
      return Float64Array.from(a); }
   let len = a.length - 1;
   while (len > 0 && Math.abs(a[len - 1]) <= eps) {
      len--; }
   if (len == 0) {
      return Float64Array.of(0); }
   const a2 = new Float64Array(len);
   for (let i = 0; i < len; i++) {
      a2[i] = a[i]; }
   return a2; }

// Divides the coefficients by the leading coefficient.
function makeMonic (a: Float64Array) {
   const len = a.length;
   if (len == 0) {
      throw new Error("Zero length array."); }
   const lc = a[len - 1];                                  // leading coefficient
   if (lc == 1) {                                          // already monic
      return; }
   if (lc == 0) {                                          // not trimmed?
      throw new Error("Leading coefficient is zero."); }
   a[len - 1] = 1;
   for (let i = 0; i < len - 1; i++) {
      a[i] /= lc; }}

function divByReal (a: ArrayLike<number>, b: number) : Float64Array {
   const a2 = new Float64Array(a.length);
   for (let i = 0; i < a.length; i++) {
      a2[i] = a[i] / b; }
   return a2; }

function divByRealInPlace (a: Float64Array, b: number) {
   for (let i = 0; i < a.length; i++) {
      a[i] /= b; }}

//--- Fractions ----------------------------------------------------------------

/**
* Evaluates a rational fraction with a complex argument.
*/
export function evaluateFractionComplex (f: ArrayLike<number>[], x: Complex) : Complex {
   const v1 = evaluateComplex(f[0], x);
   const v2 = evaluateComplex(f[1], x);
   return v1.div(v2); }

/**
* Adds two fractions.
*/
export function addFractions (f1: ArrayLike<number>[], f2: ArrayLike<number>[], eps = 0) : Float64Array[] {
   if (compareEqual(f1[1], f2[1], eps)) {                            // if same denominator
      return [add(f1[0], f2[0], eps), Float64Array.from(f1[1])]; }   // add numerators
   const g = gcd(f1[1], f2[1], eps);                                 // GCD of demoninators
   if (g.length == 1 && g[0] == 1) {                                 // if GCD is 1
      const top = add(multiply(f1[0], f2[1], eps), multiply(f2[0], f1[1], eps));
      const bottom = multiply(f1[1], f2[1], eps);
      return [top, bottom]; }
   const q1 = divide(f1[1], g, eps);
   const q2 = divide(f2[1], g, eps);
   // const r1 = q1[1];
   // const r2 = q2[1];
   // if (r1.length != 1 || r1[0] != 0 || r2.length != 1 || r2[0] != 0) {
   //    throw new Error("Program logic error (wrong GCD)."); }      // (check removed because it may be triggered by float number effects)
   const m1 = q1[0];
   const m2 = q2[0];
   const top = add(multiply(f1[0], m2, eps), multiply(f2[0], m1, eps));
   const bottom = multiply(f1[1], m2, eps);
   return [top, bottom]; }

/**
* Multiplies two fractions.
*/
export function multiplyFractions (f1: ArrayLike<number>[], f2: ArrayLike<number>[], eps = 0) : Float64Array[] {
   const top    = multiply(f1[0], f2[0], eps);
   const bottom = multiply(f1[1], f2[1], eps);
   return [top, bottom]; }

/**
* Normalizes the coefficients of a rational fraction so that the denominator polynomial is monic.
*/
export function normalizeFraction (f: ArrayLike<number>[], eps = 0) : Float64Array[] {
   const top = trim(f[0], eps);
   const bottom = trim(f[1], eps);
   const lc = bottom[bottom.length - 1];                   // leading coefficient of denominator
   if (lc == 0) {
      throw new Error("Fraction denominator is zero."); }
   divByRealInPlace(top, lc);
   divByRealInPlace(bottom, lc);
   return [top, bottom]; }
