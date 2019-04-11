/**
* Utility routines for real polynomials and fractions of real polynomials.
*
* Polynomial coefficients are stored in arrays ordered in ascending powers.
* The associated polynomial has the form:
*    a[0]  +  a[1] * x  +  a[2] * x^2  +  ...  + a[n-1] * x^(n-1)  +  a[n] * x^n
*
* For rational algebraic fractions, the coefficients are stored in nested arrays:
*    [top, bottom]
* The associated rational fraction has the form:
*    ( top[0]     +  top[1]    * x  +  top[2]    * x^2  +  ...  top[n-1]    * x^(n-1)  +  top[n]    * x^n ) /
*    ( bottom[0]  +  bottom[1] * x  +  bottom[2] * x^2  +  ...  bottom[m-1] * x^(m-1)  +  bottom[m] * x^m )
*/

import Complex from "./Complex";
import MutableComplex from "./MutableComplex";

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
export function evaluate (a: number[], x: Complex) : Complex {
   if (a.length == 0) {
      throw new Error("Zero length array."); }
   const n = a.length - 1;
   const sum = new MutableComplex(a[n]);
   for (let i = n - 1; i >= 0; i--) {
      sum.mulBy(x);
      sum.addRealTo(a[i]); }
   return sum; }

/**
* Adds two real polynomials.
*/
export function add (a1: number[], a2: number[]) : number[] {
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n3 = Math.max(n1, n2);
   const a3 = new Array<number>(n3 + 1);
   for (let i = 0; i <= n3; i++) {
      const v1 = (i <= n1) ? a1[i] : 0;
      const v2 = (i <= n2) ? a2[i] : 0;
      a3[i] = v1 + v2; }
   return a3; }

/**
* Multiplies two real polynomials.
*/
export function multiply (a1: number[], a2: number[]) : number[] {
   if (a1.length == 0 || a2.length == 0) {
      throw new Error("Zero length arrays."); }
   if (a1.length == 1 && a1[0] == 0 || a2.length == 1 && a2[0] == 0) {
      return [0]; }
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n3 = n1 + n2;
   const a3 = new Array<number>(n3 + 1);
   for (let i = 0; i <= n3; i++) {
      let t = 0;
      const p1 = Math.max(0, i - n2);
      const p2 = Math.min(n1, i);
      for (let j = p1; j <= p2; j++) {
         t += a1[j] * a2[i - j]; }
      a3[i] = t; }
   return a3; }

/**
* Returns `true` if two polynomials are equal.
*/
export function equals (a1: number[], a2: number[], eps = 0) : boolean {
   const n1 = a1.length - 1;
   const n2 = a2.length - 1;
   const n = Math.max(n1, n2);
   for (let i = 0; i <= n; i++) {
      const v1 = (i <= n1) ? a1[i] : 0;
      const v2 = (i <= n2) ? a2[i] : 0;
      if (Math.abs(v1 - v2) > eps) {
         return false; }}
   return true; }

//--- Fractions ----------------------------------------------------------------

/**
* Evaluates a rational fraction with a complex argument.
*/
export function evaluateFraction (f: number[][], x: Complex) : Complex {
   const v1 = evaluate(f[0], x);
   const v2 = evaluate(f[1], x);
   return v1.div(v2); }

/**
* Adds two fractions.
*/
export function addFractions (f1: number[][], f2: number[][]) : number[][] {
   if (equals(f1[1], f2[1])) {                             // if same denominator
      return [add(f1[0], f2[0]), f1[1].slice()]; }         // add numerators
   const top = add(multiply(f1[0], f2[1]), multiply(f2[0], f1[1]));
   const bottom = multiply(f1[1], f2[1]);
   return [top, bottom]; }

/**
* Multiplies two fractions.
*/
export function multiplyFractions (f1: number[][], f2: number[][]) : number[][] {
   const top    = multiply(f1[0], f2[0]);
   const bottom = multiply(f1[1], f2[1]);
   return [top, bottom]; }
