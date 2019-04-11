/**
* Fast Fourier Transform (FFT).
*
* This module implements the following classic FFT algorithms:
*  - Cooley-Tukey (Radix-2)
*  - Bluestein
* It is not extremely optimized, but should be reasonably fast for normal purposes.
*
*/

import ComplexArray from "../math/ComplexArray";
import MutableComplex from "../math/MutableComplex";
import * as MathUtils from "../math/MathUtils";

/**
* Computes the FFT of an array of complex numbers.
*
* Depending on the application, the output values must be normalized.
*
* @param x
*    The input values.
*    The array can have any length, but when it's is a power of 2, the computation is faster.
* @param direction
*    `true` for FFT (forward FFT), `false` for iFFT (inverse FFT).
* @returns
*    The result of the FFT, without any normalization.
*    The returned array has the same length as the input array.
*/
export function fft (x: ComplexArray, direction = true) : ComplexArray {
   const n = x.length;
   if (n <= 1) {
      return x.slice(); }
   const x2 = direction ? x : swapReIm(x);
   const x3 = MathUtils.isPowerOf2(n) ? fftCooleyTukey(x2) : fftBluestein(x2);
   const x4 = direction ? x3 : swapReIm(x3);
   return x4; }

// Cooley-Tukey algorithm for array lengths that are a power of 2.
function fftCooleyTukey (x: ComplexArray) : ComplexArray {
   const n = x.length;                                     // n is a power of 2
   const sineTable = createSineTable(n / 2, n, false);
   const a = copyBitReversed(x);
   applyButterflies(a, sineTable);
   return a; }

// Radix-2 butterflies for Cooley-Tukey.
function applyButterflies (a: ComplexArray, sineTable: ComplexArray) {
   const temp = new MutableComplex();                      // (created here to avoid allocation within the loops)
   const n = a.length;                                     // n is a power of 2
   const re = a.re;
   const im = a.im;
   for (let mMax = 1; mMax < n; mMax *= 2) {
      const step = mMax * 2;
      const sinStep = n / step;
      for (let m = 0; m < mMax; m++) {
         const wIndex = m * sinStep;
         const wRe = sineTable.re[wIndex];
         const wIm = sineTable.im[wIndex];
         for (let i = m; i < n; i += step) {
            const j = i + mMax;
            temp.setMul(re[j], im[j], wRe, wIm);
            re[j] = re[i] - temp.re;                       // a[j] = a[i] - a[j] * w
            im[j] = im[i] - temp.im;
            re[i] += temp.re;
            im[i] += temp.im; }}}}                         // a[i] = a[i] + a[j] * w

function copyBitReversed (a1: ComplexArray) : ComplexArray {
   const n = a1.length;
   const a2 = new ComplexArray(n);
   let i1 = 0;
   for (let i2 = 0; i2 < n; i2++) {
      a2.re[i2] = a1.re[i1];
      a2.im[i2] = a1.im[i1];
      i1 = incrementBitReversed(i1, n); }
   return a2; }

// Increments an integer bit-reversed.
// `n` must be a power of 2.
// tslint:disable:no-bitwise
function incrementBitReversed (i: number, n: number) : number {
   let m = n >> 1;                                         // start with lowest bit (in reverse order)
   let a = i;
   while (a & m) {                                         // while bit `m` is set
      a -= m;                                              // set bit `m` to 0
      m >>= 1; }                                           // move one bit to the right
   return a | m; }                                         // set bit `m` to 1
   // tslint:enable:no-bitwise

// Bluestein's FFT algorithm for arrays of arbitrary length.
function fftBluestein (x: ComplexArray) : ComplexArray {
   const n = x.length;
   const m = MathUtils.getNextPowerOf2(2 * n - 3);         // minimum space needed: [0 1 2 ... n-2 n-1 n-2 ... 2 1] = 2n - 2
   const sineTable = createSineOfSquareTable(n, 2 * n);
   const a1 = new ComplexArray(m);
   for (let i = 0; i < n; i++) {
      a1.setMul(i, x.re[i], x.im[i], sineTable.re[i], -sineTable.im[i]); }
   const a2 = new ComplexArray(m);
   for (let i = 0; i < n; i++) {
      ComplexArray.copy1(sineTable, i, a2, i); }
   for (let i = 1; i < n; i++) {
      ComplexArray.copy1(sineTable, i, a2, m - i); }
   const a3 = convolve(a1, a2);
   const a4 = new ComplexArray(n);
   for (let i = 0; i < n; i++) {
      a4.setMul(i, a3.re[i], a3.im[i], sineTable.re[i], -sineTable.im[i]); }
   return a4; }

// Computes the circular convolution of two arrays by multiplying their spectrums.
function convolve (a1: ComplexArray, a2: ComplexArray) : ComplexArray {
   const n = a1.length;
   if (a2.length != n) {
      throw new Error("Array lengths are not equal."); }
   const a3 = fft(a1);
   const a4 = fft(a2);
   a3.mulByArray(a4);
   const a5 = fft(a3, false);
   a5.mulAllByReal(1 / n);                                 // scaling after iFFT
   return a5; }

function createSineTable (tableLength: number, waveLength: number, rotationalDirection = true) : ComplexArray {
   const w = 2 * Math.PI / waveLength;
   const a = new ComplexArray(tableLength);
   for (let i = 0; i < tableLength; i++) {
      const t = i * w;
      a.re[i] = Math.cos(t);
      a.im[i] = rotationalDirection ? Math.sin(t) : -Math.sin(t); }
   return a; }

function createSineOfSquareTable (tableLength: number, waveLength: number) : ComplexArray {
   const w = 2 * Math.PI / waveLength;
   const a = new ComplexArray(tableLength);
   for (let i = 0; i < tableLength; i++) {
      const t = (i * i) % waveLength * w;                  // `% waveLength` is only done to improve accuracy
      a.re[i] = Math.cos(t);
      a.im[i] = Math.sin(t); }
   return a; }

// Swaps the real and imaginary parts of a complex array.
function swapReIm (a: ComplexArray) : ComplexArray {
   const a2 = new ComplexArray();
   a2.length = a.length;
   a2.re = a.im;
   a2.im = a.re;
   return a2; }

/**
* Computes the FFT of an array of real numbers and returns the complex result.
*
* This version is not optimized for real numbers.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers. It has the same size as the input array.
*    The upper half of the array contains complex conjugates of the lower half.
*/
export function fftReal (x: Float64Array) : ComplexArray {
   return fft(new ComplexArray(x)); }

/**
* Computes the lower half FFT of an array of real numbers and returns the lower half of the complex result.
*
* This version is optimized for real numbers. The size of the input array must be even.
*
* @param x
*    The input values (samples). The size must be even.
* @returns
*    An array of complex numbers. It is half the size of the input array.
*/
export function fftRealHalf (x: Float64Array) : ComplexArray {
   if (x.length <= 1) {
      return new ComplexArray(x); }
   const m = x.length;
   if (m % 2 != 0) {
      throw new Error("Input array size is not even."); }
   const n = m / 2;
   const a1 = new ComplexArray(n);
   for (let i = 0; i < n; i++) {                           // pack real values into complex array of half the size
      a1.re[i] = x[2 * i];
      a1.im[i] = x[2 * i + 1]; }
   const a2 = fft(a1);
   const a3 = new ComplexArray(n);
   const w = Math.PI / n;                                  // wave length is 2*n
   a3.re[0] = a2.re[0] + a2.im[0];
   a3.im[0] = 0;
   const temp1 = new MutableComplex();
   const temp2 = new MutableComplex();
   for (let i = 1; i < n; i++) {
      const sRe = Math.sin(i * w);
      const sIm = Math.cos(i * w);
      temp1.setMul(a2.re[i    ], a2.im[i    ], (1 - sRe) / 2, -sIm / 2);
      temp2.setMul(a2.re[n - i], a2.im[n - i], (1 + sRe) / 2, -sIm / 2);
      a3.re[i] = temp1.re + temp2.re;
      a3.im[i] = temp1.im - temp2.im; }
   return a3; }

/**
* Computes the complex spectrum of an array of real numbers.
* The result is the normalized lower half of the FFT.
*
* If `x.length` is even and `inclNyquist == false`, the computation is faster.
* And if `x.length` is a power of 2, it's also faster.
*
* @param x
*    The input values (samples).
* @param inclNyquist
*    If `true` and `x.length` is even, the value for the relative frequency `x.length / 2`
*    (Nyquist frequency, half the sample rate) is included in the output array.
*    This is done to allow an exact re-synthesis of the original signal from the spectrum.
*    But the Nyquist frequency component is an artifact and does not represent the phase
*    and amplitude of that frequency. The phase is always 0.
*    It's not possible to compute a proper value for the Nyquist frequency.
* @returns
*    An array of complex numbers that represent the spectrum of the input signal.
*/
export function fftRealSpectrum (x: Float64Array, inclNyquist = false) : ComplexArray {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   let a: ComplexArray;
   if (n % 2 == 0 && !inclNyquist) {
      a = fftRealHalf(x); }
    else {
      const a0 = fftReal(x);
      a = a0.subarray(0, Math.floor(n / 2) + 1); }
   for (let i = 0; i < a.length; i++) {
      const r = (i == 0 || i == n / 2) ? 1 / n : 2 / n;
      a.mulByReal(i, r); }
   return a; }

/**
* Shifts the zero-frequency component to the center of the spectrum.
* The input array it rotated by `x.length / 2` to the right.
*/
export function fftShift (x: ComplexArray) : ComplexArray {
   const n = x.length;
   const d = Math.floor(n / 2);
   const a = new ComplexArray(n);
   for (let p = 0; p < n; p++) {
      ComplexArray.copy1(x, p, a, (p + d) % n); }
   return a; }
