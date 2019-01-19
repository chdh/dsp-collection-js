/**
* Fast Fourier Transform (FFT).
*/

import Complex from "../math/Complex";
import MutableComplex from "../math/MutableComplex";
import * as MathUtils from "../math/MathUtils";

/**
* Computes the FFT of an array of complex numbers.
*
* This is a simple, non-optimized implementation of the classic FFT algorithm.
*
* Depending on the application, the output values must be normalized.
*
* @param x
*    The input values. The array length must be a power of 2.
* @param direction
*    `true` for FFT (forward FFT), `false` for iFFT (inverse FFT).
* @returns
*    The result of the FFT, without any normalization.
*    The returned array has the same length as the input array.
*/
export function fft (x: Complex[], direction: boolean) : MutableComplex[] {
   const n = x.length;
   if (!MathUtils.isPowerOf2(n)) {
      throw new Error("Input array length is not a valid power of 2."); }
   const sineTable = createSineTable(n, direction);
   const a = copyBitReversed(x);
   butterflies(a, sineTable);
   return a; }

function butterflies (a: MutableComplex[], sineTable: Complex[]) {
   const temp = new MutableComplex();                      // (is here to avoid allocation within the loops)
   const n = a.length;                                     // n is a power of 2
   for (let mMax = 1; mMax < n; mMax <<= 1) {
      const step = mMax << 1;
      const sinStep = n / step;
      for (let m = 0; m < mMax; m++) {
         const w = sineTable[m * sinStep];
         for (let i = m; i < n; i += step) {
            const j = i + mMax;
            temp.set(a[j]);
            temp.mulBy(w);
            a[j].set(a[i]);
            a[j].subFrom(temp);
            a[i].addTo(temp); }}}}

function copyBitReversed (a1: Complex[]) : MutableComplex[] {
   const n = a1.length;
   const a2: MutableComplex[] = Array(n);
   let i1 = 0;
   for (let i2 = 0; i2 < n; i2++) {
      a2[i2] = MutableComplex.fromComplex(a1[i1]);
      i1 = incrementBitReversed(i1, n); }
   return a2; }

// Increments an integer bit-reversed.
// `n` must be a power of 2.
function incrementBitReversed (i: number, n: number) : number {
   let m = n >> 1;                                         // start with lowest bit (in reverse order)
   let a = i;
   while (a & m) {                                         // while bit `m` is set
      a -= m;                                              // set bit `m` to 0
      m >>= 1; }                                           // move one bit to the right
   return a | m; }                                         // set bit `m` to 1

// `n` must be a power of 2.
function createSineTable (n: number, direction: boolean) : Complex[] {
   if (n <= 1) {
      return []; }
   const len = n / 2;
   const incr = 2 * Math.PI / n;
   const a: Complex[] = Array(len);
   for (let i = 0; i < len; i++) {
      const t = i * incr;
      a[i] = new Complex(Math.cos(t), direction ? -Math.sin(t) : Math.sin(t)); }
   return a; }

/**
* Shifts the zero-frequency component to the center of the spectrum.
* The input array it rotated by `x.length / 2` to the right.
*/
export function fftShift (x: Complex[]) : Complex[] {
   const n = x.length;
   const d = Math.floor(n / 2);
   const a : Complex[] = Array(n);
   for (let p = 0; p < n; p++) {
      a[(p + d) % n] = x[p]; }
   return a; }
