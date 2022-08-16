// Test program for the Resampling module.

import * as Resampling from "dsp-collection/signal/Resampling.js";
import * as MathUtils from "dsp-collection/math/MathUtils.js";

function main() {
   testResampleLinear();
   testResampleLinearRandom();
   testResampleAverage();
   testResampleAverageRandom();
   console.log("TestResampling completed."); }

function testResampleLinear() {
   checkResampleLinear([1, 2, 3, 4], [1, 2, 3, 4]);
   checkResampleLinear([1, 2, 3], [1, 2, 3]);
   checkResampleLinear([1, 2, 3, 4], [1, 2.5, 4]);
   checkResampleLinear([1, 4, 2, 7], [1, 3, 7]);
   checkResampleLinear([-1, -2, -3, -4], [-1, -2.5, -4]);
   checkResampleLinear([1, 3], [1, 2, 3]);
   checkResampleLinear([1, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
   checkResampleLinear([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 10]);
   checkResampleLinear([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 5.5, 10]);
   checkResampleLinear([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 4, 7, 10]);
   checkResampleLinear([1, 4, 7, 10], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
   checkResampleLinear([1, 4, 7, 13], [1, 2, 3, 4, 5, 6, 7, 9, 11, 13]);
   checkResampleLinear([1, 2, 3, 4, 5, 6, 7, 9, 11, 13], [1, 4, 7, 13]);
   checkResampleLinear([1, 3, 10], [1, 2, 3, 6.5, 10]);
   checkResampleLinear([1, 3, 10, 20], [1, 2, 3, 6.5, 10, 15, 20]);
   checkResampleLinear([-5, 0, 10], [-5, -2.5, 0, 5, 10]);
   checkResampleLinear([-5, 0, -10], [-5, -2.5, 0, -5, -10]); }

function testResampleLinearRandom() {
   console.log("testResampleLinearRandom");
   for (let i = 0; i < 1000000; i++) {
      if (i % 100000 == 0) {
         process.stdout.write("."); }
      const n1 = rndInt(2, 20);
      const n2 = rndInt(2, 20);
      const a = genRandomFloat64Array(n1, 1E4);
      checkResampleLinear2(a, n2); }
   console.log(); }

function checkResampleLinear (a1: ArrayLike<number>, a2: ArrayLike<number>) {
   const a3 = new Float64Array(a2.length);
   const a4 = new Float64Array(a2.length);
   Resampling.resampleLinear(a1, a3);
   Resampling.resampleLinearSlow(a1, a4);
   verifyEqualArray(a3, a2, 1E-10);
   verifyEqualArray(a3, a4, 1E-10);
   checkResampleLinear2(a1, a2.length); }

function checkResampleLinear2 (a1: ArrayLike<number>, n: number) {
   const a2 = new Float64Array(n);
   const a3 = new Float64Array(n);
   Resampling.resampleLinear(a1, a2);
   Resampling.resampleLinearSlow(a1, a3);
   verifyEqualArray(a2, a3, 1E-10); }

function testResampleAverage() {
   checkResampleAverage([0, 2], [0, 0, 1, 2, 2]);
   checkResampleAverage([1, 2, 3, 4], [1.5, 3.5]);
   checkResampleAverage([0, 1, 0, 1], [0.25, 0.5, 0.75]);
   checkResampleAverage([1, 1, 1, 1, 1], [1, 1]);
   checkResampleAverage([1, 1], [1, 1, 1, 1, 1]); }

function testResampleAverageRandom() {
   console.log("testResampleAverageRandom");
   for (let i = 0; i < 1000000; i++) {
      if (i % 100000 == 0) {
         process.stdout.write("."); }
      const n1 = rndInt(2, 20);
      const n2 = rndInt(2, 20);
      const a = genRandomFloat64Array(n1, 1E4);
      checkResampleAverage2(a, n2); }
   console.log(); }

function checkResampleAverage (a1: ArrayLike<number>, a2: ArrayLike<number>) {
   const a3 = new Float64Array(a2.length);
   const a4 = new Float64Array(a2.length);
   Resampling.resampleAverage(a1, a3);
   Resampling.resampleAverageSlow(a1, a4);
   verifyEqualArray(a3, a2, 1E-10);
   verifyEqualArray(a3, a4, 1E-10);
   checkResampleAverage2(a1, a2.length); }

function checkResampleAverage2 (a1: ArrayLike<number>, n: number) {
   const a2 = new Float64Array(n);
   const a3 = new Float64Array(n);
   Resampling.resampleAverage(a1, a2);
   Resampling.resampleAverageSlow(a1, a3);
   verifyEqualArray(a2, a3, 1E-10); }

//------------------------------------------------------------------------------

function genRandomFloat64Array (n: number, maxValue: number) : Float64Array {
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = rnd(maxValue); }
   return a; }

// Returns a random float number between -maxValue and maxValue.
function rnd (maxValue: number) : number {
   return (Math.random() - 0.5) * 2 * maxValue; }

// Returns a random integer bwtween minValue and maxValue (inclusive).
function rndInt (minValue: number, maxValue: number) : number {
   return minValue + Math.floor(Math.random() * (maxValue - minValue + 1)); }

function verifyEqualArray (a1: ArrayLike<number>, a2: ArrayLike<number>, eps: number) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (!MathUtils.fuzzyEquals(a1[i], a2[i], eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1[i] + " " + a2[i] + " diff=" + Math.abs(a1[i] - a2[i]) + " eps=" + eps + "."); }}}

main();
