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
* A common structural interface for `Float64Array`, `Float32Array` and `number[]`.
*/
export interface NumericArray {
   readonly length: number;
   [index: number]: number;

   // Element access / iteration
   // at (index: number) : number | undefined;                                    // include later for ES2022
   [Symbol.iterator]() : IterableIterator<number>;
   entries() : IterableIterator<[number, number]>;
   keys() : IterableIterator<number>;
   values() : IterableIterator<number>;

   // Search / tests
   includes (value: number, fromIndex?: number) : boolean;
   indexOf (value: number, fromIndex?: number) : number;
   lastIndexOf (value: number, fromIndex?: number) : number;
   find (fn: (value: number, index: number) => boolean) : number | undefined;
   findIndex (fn: (value: number, index: number) => boolean) : number;
   // findLast (fn: (value: number, index: number) => boolean) : number | undefined;   // include later for ES2023
   // findLastIndex (fn: (value: number, index: number) => boolean) : number;          // include later for ES2023
   every (fn: (value: number, index: number) => boolean) : boolean;
   some (fn: (value: number, index: number) => boolean) : boolean;

   // Same-kind results
   // Methods that yield an array of the same kind are typed with the polymorphic `this` type.
   map (fn: (value: number, index: number) => number) : this;
   filter (fn: (value: number, index: number) => boolean) : this;
   slice (start?: number, end?: number) : this;

   // In-place operations
   fill (value: number, start?: number, end?: number) : this;
   copyWithin (target: number, start: number, end?: number) : this;
   reverse () : this;
   sort (compareFn: (a: number, b: number) => number) : this;                  // comparator deliberately required

   // reduction / misc
   forEach (fn: (value: number, index: number) => void) : void;
   reduce (fn: (acc: number, value: number, index: number) => number) : number;
   reduce<U> (fn: (acc: U, value: number, index: number) => U, initial: U) : U;
   reduceRight (fn: (acc: number, value: number, index: number) => number) : number;
   reduceRight<U> (fn: (acc: U, value: number, index: number) => U, initial: U) : U;
   join (separator?: string) : string; }

/**
* Compile-time assertions that the concrete types `Float64Array`, `Float32Array`
* and `number[]`satisfy NumericArray.
* @hidden
*/
export type _NumericArrayChecks = [                                            // (export is only added to suppress not-used compiler warning)
   TypeMustExtend<Float64Array, NumericArray>,
   TypeMustExtend<Float32Array, NumericArray>,
   TypeMustExtend<number[],     NumericArray>];
type TypeMustExtend<A extends B, B> = A;

export interface NumericArrayConstructor<T extends NumericArray> {
   new (length: number): T; }

/**
* Allocates a new numeric array of the same type as `template`.
*/
export function allocNumericArrayLike<T extends NumericArray> (template: T, length: number) : T {
   const a = new (template.constructor as NumericArrayConstructor<T>)(length);
   if (Array.isArray(a)) {
      a.fill(0); }                                      // new Array(n) is sparse
   return a; }

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
