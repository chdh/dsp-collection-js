// Test program for the Fft module.

import Complex from "dsp-collection/math/Complex";
import ComplexArray from "dsp-collection/math/ComplexArray";
import * as MathUtils from "dsp-collection/math/MathUtils";
import * as Fft from "dsp-collection/signal/Fft";
import * as Dft from "dsp-collection/signal/Dft";
import {performance as Performance} from "perf_hooks";

let fftTime = 0;
let dftTime = 0;

function main() {
   const startTime = Performance.now();
   testFftKnown();
   testFftAgainstDftRandom();
   testFftRealSpectrum();
   testFftRealSpectrumRandom();
   testFftRealHalf();
   const elapsedMs = Math.round(Performance.now() - startTime);
   console.log(`TestFft completed in ${elapsedMs} ms. fftTime=${Math.round(fftTime)} ms, dftTime=${Math.round(dftTime)} ms`); }

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
   for (let i = 0; i < 10000; i++) {
      if (i % 1000 == 0) {
         process.stdout.write("."); }
//    const n = 2 ** Math.floor(Math.random() * 7);
      const n = Math.floor(1 + Math.random() * 64);
      const a = genRandomComplexArray(n, 1E4);
      const direction = Math.random() < 0.5;
      checkFft(a, direction); }
   console.log(); }

function checkFft (a: ComplexArray, direction: boolean) {
   const n = a.length;
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

function rnd (maxValue: number) : number {
   return (Math.random() - 0.5) * 2 * maxValue; }

function verifyEqualComplex (a1: ComplexArray, a2: ComplexArray, eps: number) {
   if (a1.length != a2.length) {
      throw new Error(`Array sizes are not equal, a1.length=${a1.length}, a2.length=${a2.length}.`); }
   for (let i = 0; i < a1.length; i++) {
      if (!a1.get(i).fuzzyEquals(a2.get(i), eps)) {
         throw new Error("Difference detected in arrays at position " + i + ": " + a1.get(i) + " " + a2.get(i) + "."); }}}

main();
