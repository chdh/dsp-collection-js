// Test program for the Fft module.

import Complex from "dsp-collection/math/Complex.js";
import ComplexArray from "dsp-collection/math/ComplexArray.js";
import * as MathUtils from "dsp-collection/math/MathUtils.js";
import * as Fft from "dsp-collection/signal/Fft.js";
import * as Dft from "dsp-collection/signal/Dft.js";
import {performance as Performance} from "perf_hooks";

var fftTime: number;
var dftTime: number;

function main() {
   console.log("TestFft started.");
   const startTime = Performance.now();
   testFftKnown();
   testFftAgainstDftRandom();
   testFftRealSpectrum();
   testFftRealSpectrumRandom();
   testFftRealHalf();
   testIFftRealSpectrum();
   const elapsedMs = Math.round(Performance.now() - startTime);
   console.log(`TestFft completed in ${elapsedMs} ms.`); }

// Test fft() with known results.
function testFftKnown() {
   const a1 = new ComplexArray([
      new Complex( 3,  8),
      new Complex( 4, -3),
      new Complex( 2,  2),
      new Complex( 1,  9),
      new Complex(-7,  1),
      new Complex( 4, -5),
      new Complex(-2,  5),
      new Complex( 5,  3) ]);
   const b1 = new ComplexArray([
      // Result from http://scistatcalc.blogspot.com/2013/12/fft-calculator.html
      new Complex( 10.000000, 20.000000),
      new Complex( 15.485281,  3.000000),
      new Complex(-24.000000,  0.000000),
      new Complex( 15.828427, 16.656854),
      new Complex(-18.000000, 12.000000),
      new Complex( -1.485281,  3.000000),
      new Complex( 16.000000,  4.000000),
      new Complex( 10.171573,  5.343146) ]);
   checkFftResult(a1, b1, 1E-6); }

function checkFftResult (a: ComplexArray, b: ComplexArray, eps: number) {
   const n = a.length;
   const c = Fft.fft(a, true);
   verifyEqualComplex(c, b, eps);
   for (let p = 0; p < n; p++) {
      c.divByReal(p, n); }                                 // normalize
   const d = Fft.fft(c, false);
   verifyEqualComplex(a, d, 1E-15); }

function testFftAgainstDftRandom() {
   console.log("testFftAgainstDftRandom");
   fftTime = 0;
   dftTime = 0;
   for (let i = 0; i < 10000; i++) {
      if (i % 1000 == 0) {
         process.stdout.write("."); }
      const n = rndInt(1, 100);
      const a = genRandomComplexArray(n, 1E4);
      const direction = Math.random() < 0.5;
      checkFft(a, direction); }
   console.log();
   console.log(`fftTime=${Math.round(fftTime)} ms, dftTime=${Math.round(dftTime)} ms`); }

function checkFft (a: ComplexArray, direction: boolean) {
   const t1 = Performance.now();
   const b1 = Fft.fft(a, direction);
   const t2 = Performance.now();
   fftTime += t2 - t1;
   const b2 = Dft.dft(a, direction);
   const t3 = Performance.now();
   dftTime += t3 - t2;
   verifyEqualComplex(b1, b2, 1E-8); }

function testFftRealSpectrum() {
   const a1 = new Float64Array([1, 3, 4, 3, 1, 2]);
   checkFftRealSpectrum(a1, true);
   //
   const a2 = new Float64Array([-1, 3, 2, 8, 3]);
   checkFftRealSpectrum(a2, true); }

function testFftRealSpectrumRandom() {
   console.log("testFftRealSpectrumRandom");
   for (let i = 0; i < 500000; i++) {
      if (i % 10000 == 0) {
         process.stdout.write("."); }
      const n = 1 + Math.floor(Math.random() * 20);
      const a = genRandomFloat64Array(n, 1E4);
      const inclNyquist = Math.random() < 0.5;
      checkFftRealSpectrum(a, inclNyquist); }
   console.log(); }

function checkFftRealSpectrum (a: Float64Array, inclNyquist: boolean) {
   const b1 = Fft.fftRealSpectrum(a, inclNyquist);
   const b2 = Dft.dftRealSpectrum(a, inclNyquist);
   verifyEqualComplex(b1, b2, 1E-9); }

function testFftRealHalf() {
   console.log("testFftRealHalf");
   for (let i = 0; i < 500000; i++) {
      if (i % 10000 == 0) {
         process.stdout.write("."); }
      const n = 2 * Math.floor(1 + Math.random() * 10);
      const a = genRandomFloat64Array(n, 1E4);
      checkFftRealHalf(a); }
   console.log(); }

function checkFftRealHalf (a: Float64Array) {
   const b1 = Fft.fftRealHalf(a);
   const b2 = Dft.dftRealHalf(a);
   verifyEqualComplex(b1, b2, 1E-9); }

// Tests inverse FFT for real signals against DFT version.
function testIFftRealSpectrum() {
   console.log("testIFftRealSpectrum");
   for (let i = 0; i < 200000; i++) {
      if (i % 10000 == 0) {
         process.stdout.write("."); }
      const n = rndInt(1, 20);
      const a = genRandomComplexArray(n, 1E4);
      checkIFftRealSpectrum(a); }
   console.log(); }

function checkIFftRealSpectrum (a: ComplexArray) {
   const sup = rndInt(0, 2);
   const len = a.length * 2 - sup;
   const b1 = Fft.iFftRealHalfSimple(a, len, true);
   const b2 = Dft.iDftRealSpectrum(a, len);
   verifyEqualFloat64(b1, b2, 1E-9);
   if (sup == 0 || sup == 2) {
      const b3 = Fft.iFftRealHalfOpt(a, len, sup == 2);
      verifyEqualFloat64(b3, b2, 1E-9); }}

//------------------------------------------------------------------------------

function genRandomComplexArray (n: number, maxValue: number) : ComplexArray {
   const a = new ComplexArray(n);
   for (let i = 0; i < n; i++) {
      const c = new Complex(rnd(maxValue), rnd(maxValue));
      a.set(i, c); }
   return a; }

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

function verifyEqualFloat64 (a1: Float64Array, a2: Float64Array, eps: number) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (!MathUtils.fuzzyEquals(a1[i], a2[i], eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1[i] + " " + a2[i] + " diff=" + Math.abs(a1[i] - a2[i]) + " eps=" + eps + "."); }}}

function verifyEqualComplex (a1: ComplexArray, a2: ComplexArray, eps: number) {
   if (a1.length != a2.length) {
      throw new Error(`Array sizes are not equal, a1.length=${a1.length}, a2.length=${a2.length}.`); }
   for (let i = 0; i < a1.length; i++) {
      if (!a1.get(i).fuzzyEquals(a2.get(i), eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1.get(i) + " " + a2.get(i) + "."); }}}

main();
