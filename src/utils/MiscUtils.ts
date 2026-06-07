/**
* General utility functions.
*
* @module
*/

/**
* Throws an exception if a condition is not `true`.
*/
export function assert (cond: boolean) : asserts cond {
   if (!cond) {
      throw new Error("Assertion failed."); }}

/**
* A generic mutable array-like type.
*/
export interface MutableArrayLike<T> {
   readonly length: number;
   [index: number]: T; }

/**
* Returns a function that caches the values of the given univariate function.
*/
export function createMapBackedFunction<X,Y> (f: (x: X) => Y) : (x: X) => Y {
   const map = new Map<X,Y>();
   return function (x: X) {
      let y = map.get(x);
      if (y !== undefined) {
         return y; }
      y = f(x);
      if (y === undefined) {
         return y; }
      map.set(x, y);
      return y; }; }
