// Test program for the Fft module.

import Complex from "dsp-collection/math/Complex";
import * as MathUtils from "dsp-collection/math/MathUtils";
import * as Fft from "dsp-collection/transform/Fft";
import * as Dft from "dsp-collection/transform/Dft";

function main() {
   testFftKnown();
   testFftAgainstDftRandom();
   console.log("TestFft completed."); }

// Test fft() with known results.
function testFftKnown() {
   const a1 = [
      new Complex( 3,  8),
      new Complex( 4, -3),
      new Complex( 2,  2),
      new Complex( 1,  9),
      new Complex(-7,  1),
      new Complex( 4, -5),
      new Complex(-2,  5),
      new Complex( 5,  3)];
   const b1 = [
      // Result from http://scistatcalc.blogspot.com/2013/12/fft-calculator.html
      new Complex( 10.000000, 20.000000),
      new Complex( 15.485281,  3.000000),
      new Complex(-24.000000,  0.000000),
      new Complex( 15.828427, 16.656854),
      new Complex(-18.000000, 12.000000),
      new Complex( -1.485281,  3.000000),
      new Complex( 16.000000,  4.000000),
      new Complex( 10.171573,  5.343146)];
   checkFftResult(a1, b1, 1E-6); }

function checkFftResult (a: Complex[], b: Complex[], eps: number) {
   const n = a.length;
   const c = Fft.fft(a, true);
   verifyEqualComplex(c, b, eps);
   for (let p = 0; p < n; p++) {
      c[p].divByReal(n); }                                 // normalize
   const d = Fft.fft(c, false);
   verifyEqualComplex(a, d, 1E-15); }

function testFftAgainstDftRandom() {
   for (let i = 0; i < 100000; i++) {
      if (i % 1000 == 0) {
         process.stdout.write("."); }
      const n = 2 ** Math.floor(Math.random() * 7);
      const a = genRandomComplexArray(n, 1E4);
      const direction = Math.random() < 0.5;
      checkFft(a, direction); }
   console.log(); }

function checkFft (a: Complex[], direction: boolean) {
   const n = a.length;
   const b1 = Fft.fft(a, direction);
   const b2 = Dft.dft(a, direction);
   verifyEqualComplex(b1, b2, 1E-8); }

function genRandomComplexArray (n: number, maxValue: number) : Complex[] {
   const a : Complex[] = Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = new Complex(rnd(maxValue), rnd(maxValue)); }
   return a; }

function rnd (maxValue: number) : number {
   return (Math.random() - 0.5) * 2 * maxValue; }

function verifyEqualComplex (a1: Complex[], a2: Complex[], eps: number) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (!a1[i].fuzzyEquals(a2[i], eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1[i] + " " + a2[i] + "."); }}}

main();
