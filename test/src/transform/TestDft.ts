// Test program for the Dft and Goertzel modules.

import Complex from "dsp-collection/math/Complex";
import * as MathUtils from "dsp-collection/math/MathUtils";
import * as Dft from "dsp-collection/transform/Dft";
import * as Goertzel from "dsp-collection/transform/Goertzel";

function main() {
   testDftRealKnown();
   testDftKnown();
   testDftRealSpectrum();
   testDftRealSpectrumRandom();
   console.log("TestDft completed."); }

// Test dftReal() and goertzel() with known results.
function testDftRealKnown() {
   const a1 = new Float64Array([1, 3, 4, 3, 1, 2]);
   const b1 = [
      // Result from http://calculator.vhex.net/calculator/fast-fourier-transform-calculator-fft/1d-discrete-fourier-transform
      new Complex( 14,  0        ),
      new Complex( -2, -3.464102 ),
      new Complex( -1,  1.732051 ),
      new Complex( -2,  0        ),
      new Complex( -1, -1.732051 ),
      new Complex( -2,  3.464102 )];
   checkDftRealResult(a1, b1, 1E-6);
   //
   const a2 = new Float64Array([-1, 3, 2, 8, 3]);
   const b2 = [
      // Result from http://calculator.vhex.net/calculator/fast-fourier-transform-calculator-fft/1d-discrete-fourier-transform
      new Complex( 15       ,  0        ),
      new Complex( -7.236068,  3.526712 ),
      new Complex( -2.763932, -5.706339 ),
      new Complex( -2.763932,  5.706339 ),
      new Complex( -7.236068, -3.526712 )];
   checkDftRealResult(a2, b2, 1E-6); }

function checkDftRealResult (a: Float64Array, b: Complex[], eps: number) {
   const c1 = Dft.dftReal(a);
   const c2 = Goertzel.goertzel(a);
   verifyEqualComplex(c1, b, eps);
   verifyEqualComplex(c2, b, eps); }

// Test dft() with known results.
function testDftKnown() {
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
   checkDftResult(a1, b1, 1E-6); }

function checkDftResult (a: Complex[], b: Complex[], eps: number) {
   const n = a.length;
   const c = Dft.dft(a, true);
   verifyEqualComplex(c, b, eps);
   for (let p = 0; p < n; p++) {
      c[p].divByReal(n); }                                 // normalize
   const d = Dft.dft(c, false);
   verifyEqualComplex(a, d, 1E-12); }

// Test dftRealSpectrum() and goertzelSpectrum() with iDftRealSpectrum().
function testDftRealSpectrum() {
   const a1 = new Float64Array([1, 3, 4, 3, 1, 2]);
   checkDftSpectrum(a1);
   //
   const a2 = new Float64Array([-1, 3, 2, 8, 3]);
   checkDftSpectrum(a2); }

// Use random numbers to test directDftSpectrum() and goertzelSpectrum() with iDftRealSpectrum().
function testDftRealSpectrumRandom() {
   for (let i = 0; i < 500000; i++) {
      if (i % 10000 == 0) {
         process.stdout.write("."); }
      const n = 1 + Math.floor(Math.random() * 20);
      const a = genRandomFloat64Array(n, 1E4);
      checkDftSpectrum(a); }
   console.log(); }

function checkDftSpectrum (a: Float64Array) {
   const b1 = Dft.dftRealSpectrum(a);
   const b2 = Goertzel.goertzelSpectrum(a);
   verifyEqualComplex(b1, b2, 1E-10);
   const odd = a.length % 2 != 0;
   const c = Dft.iDftRealSpectrum(b1, odd);
   verifyEqualFloat64(a, c, 1E-10); }

function genRandomFloat64Array (n: number, maxValue: number) : Float64Array {
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = rnd(maxValue); }
   return a; }

function rnd (maxValue: number) : number {
   return (Math.random() - 0.5) * 2 * maxValue; }

function verifyEqualFloat64 (a1: Float64Array, a2: Float64Array, eps: number) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (!MathUtils.fuzzyEquals(a1[i], a2[i], eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1[i] + " " + a2[i] + " diff=" + Math.abs(a1[i] - a2[i]) + " eps=" + eps + "."); }}}

function verifyEqualComplex (a1: Complex[], a2: Complex[], eps: number) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (!a1[i].fuzzyEquals(a2[i], eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1[i] + " " + a2[i] + "."); }}}

main();
