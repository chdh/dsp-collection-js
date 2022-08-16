/**
* Simple operations on arrays.
*/

import {MutableArrayLike} from "../utils/MiscUtils.js";

/**
* Returns the maximum value of an array.
*/
export function max (a: ArrayLike<number>) : number {
   if (a.length == 0) {
      return NaN; }
   let maxVal = a[0];
   for (let p = 1; p < a.length; p++) {
      if (a[p] > maxVal) {
         maxVal = a[p]; }}
   return maxVal; }

/**
* Returns the index of the maximum value of an array.
*/
export function argMax (a: ArrayLike<number>) : number {
   if (a.length == 0) {
      return NaN; }
   let maxPos = 0;
   let maxVal = a[0];
   for (let p = 1; p < a.length; p++) {
      if (a[p] > maxVal) {
         maxPos = p;
         maxVal = a[p]; }}
   return maxPos; }

/**
* Returns the index of the first array entry greater than or equal to the specified value `v`.
* Or NaN if no such element can be found.
*/
export function argGte (a: ArrayLike<number>, v: number) : number {
   for (let p = 0; p < a.length; p++) {
      if (a[p] >= v) {
         return p; }}
   return NaN; }

/**
* Multiplies the values of two arrays and returns the result in a new array.
*/
export function multiply<T extends ArrayLike<number>> (a1: T, a2: T) : T {
   const n = a1.length;
   const a = new (<any>a1).constructor(n);
   for (let i = 0; i < n; i++) {
      a[i] = a1[i] * a2[i]; }
   return <T>a; }

/**
* Divides the values of two arrays and returns the result in a new array.
*/
export function divide<T extends ArrayLike<number>> (a1: T, a2: T) : T {
   const n = a1.length;
   const a = new (<any>a1).constructor(n);
   for (let i = 0; i < n; i++) {
      a[i] = a1[i] / a2[i]; }
   return <T>a; }

/**
* Copies a1 to a2.
*/
export function copy (a1: ArrayLike<number>, a2: MutableArrayLike<number>) {
   const n = Math.min(a1.length, a2.length);
   for (let i = 0; i < n; i++) {
      a2[i] = a1[i]; }}

/**
* Fills an array.
*/
export function fill<T> (a: MutableArrayLike<T>, value: T) {
   for (let i = 0; i < a.length; i++) {
      a[i] = value; }}

/**
* Returns the sum of all numbers of the array.
*/
export function sum (a: ArrayLike<number>) : number {
   let acc = 0;
   for (let i = 0; i < a.length; i++) {
      acc += a[i]; }
   return acc; }
