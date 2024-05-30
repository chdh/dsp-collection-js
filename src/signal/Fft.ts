/**
* Fast Fourier Transform (FFT).
*
* This module implements the following classic FFT algorithms:
*  - Cooley-Tukey (Radix-2)
*  - Bluestein
* It is not extremely optimized, but should be reasonably fast for normal purposes.
*/

import ComplexArray from "../math/ComplexArray.js";
import MutableComplex from "../math/MutableComplex.js";
import * as MathUtils from "../math/MathUtils.js";

var cooleyTukeySineTableCache: Array<ComplexArray>;

/**
* Computes the FFT of an array of complex numbers.
*
* Depending on the application, the output values must be normalized.
*
* @param x
*    The input values.
*    The array can have any length, but when it's a power of 2, the computation is faster.
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
   const sineTable = getCachedCooleyTukeySineTable(n);
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
function incrementBitReversed (i: number, n: number) : number {
   let m = n >> 1;                                         // start with lowest bit (in reverse order)
   let a = i;
   while (a & m) {                                         // while bit `m` is set
      a -= m;                                              // set bit `m` to 0
      m >>= 1; }                                           // move one bit to the right
   return a | m; }                                         // set bit `m` to 1

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

function getCachedCooleyTukeySineTable (n: number) : ComplexArray {
   if (!cooleyTukeySineTableCache) {
      cooleyTukeySineTableCache = new Array<ComplexArray>(16); } // (16 is not a limit, the array can grow dynamically)
   const log2N = MathUtils.floorLog2(n);
   if (!cooleyTukeySineTableCache[log2N]) {
      cooleyTukeySineTableCache[log2N] = createCooleyTukeySineTable(n); }
   return cooleyTukeySineTableCache[log2N]; }

function createCooleyTukeySineTable (n: number) : ComplexArray {
   return createSineTable(n / 2, n, false); }

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
* This version is not optimized for real numbers. The input array can have any size.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers. It has the same size as the input array.
*    The upper half of the array contains complex conjugates of the lower half.
*/
export function fftReal (x: ArrayLike<number>) : ComplexArray {
   return fft(new ComplexArray(x)); }

/**
* Computes the lower half FFT of an array of real numbers and returns the lower half of the complex result.
*
* This version is optimized for real numbers. The time-consuming FFT algorithm is only performed
* with half the array size of the input signal.
*
* The size of the input array must be even.
*
* @param x
*    The input values (samples). The size must be even.
* @param inclNyquist
*    If `true`, the Nyquist frequency component artifact is appended to the output array.
* @returns
*    An array of complex numbers.
*    If `inclNyquist`is `false, the output array is half the size of the input array.
*    Otherwise it is 1 element longer.
*/
export function fftRealHalf (x: ArrayLike<number>, inclNyquist = false) : ComplexArray {
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
   const a2 = fft(a1);                                     // complex FFT with half the array size
   const a3 = new ComplexArray(n + (inclNyquist ? 1 : 0));
   a3.re[0] = a2.re[0] + a2.im[0];
   a3.im[0] = 0;
   if (inclNyquist) {
      a3.re[n] = a2.re[0] - a2.im[0];
      a3.im[n] = 0; }
   const temp1 = new MutableComplex();
   const temp2 = new MutableComplex();
   const w = Math.PI / n;                                  // wave length is 2 * n
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
* If `x.length` is even, the computation is faster. And if `x.length` is a power of 2, it's even faster.
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
export function fftRealSpectrum (x: ArrayLike<number>, inclNyquist = false) : ComplexArray {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   let a: ComplexArray;
   if (n % 2 == 0) {                                                 // even length
      a = fftRealHalf(x, inclNyquist); }
    else {                                                           // odd length
      const a0 = fftReal(x);
      a = a0.subarray(0, Math.floor(n / 2) + 1); }
   for (let i = 0; i < a.length; i++) {                              // normalize amplitudes
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

/**
* Computes the inverse FFT for a real signal. Non-optimized version.
*
* This version is not optimized for real numbers. The input array can have any size.
*
* This is an inverse function of `fftRealSpectrum()`.
*
* @param x
*    An array of complex numbers that define the amplitudes and phases of the sinusoidal frequency components.
*    This corresponds to the normalized lower half of the FFT output.
*    For even output signal lengths, it can include an additional entry for the nyquist frequency component.
*    If this array is longer than required, the extra values are ignored. If it is shorter, the missing values
*    are assumed to be zero.
* @param len
*    Output signal length.
* @param inclNyquist
*    If `true` and `len` is even, the value at `x[len / 2]` is included in the inverse FFT.
* @returns
*    An array of real numbers that represent the signal which is the sum of the sinusoidal components.
*/
export function iFftRealHalfSimple (x: ComplexArray, len: number, inclNyquist = false) : Float64Array {
   if (x.length == 0 || len <= 0) {
      return new Float64Array(0); }
   const x2 = createFullSpectrumFromHalfSpectrum(x, len, inclNyquist); // full spectrum including complex conjugates
   const a = fft(x2, false);
   return a.re; }

// Creates the full spectrum from the lower half spectrum of a real signal.
function createFullSpectrumFromHalfSpectrum (x: ComplexArray, len: number, inclNyquist: boolean) {
   const x2 = new ComplexArray(len);
   ComplexArray.copy1(x, 0, x2, 0);                                  // copy DC component
   if (inclNyquist && len % 2 == 0 && x.length > len / 2) {
      ComplexArray.copy1(x, len / 2, x2, len / 2); }                 // copy nyquist frequency component
   const n2 = Math.min(x.length - 1, Math.floor((len - 1) / 2));     // nunber of complex conjugates
   for (let i = 0; i < n2; i++) {                                    // copy complex conjugates
      const p1 = 1 + i;
      const p2 = len - 1 - i;
      x2.re[p2] = x.re[p1];
      x2.im[p2] = -x.im[p1]; }
   return x2; }

/**
* Computes the inverse FFT for a real signal. Optimized version.
*
* This version is optimized for real numbers. The time-consuming FFT algorithm is only performed
* with half the array size of the output signal.
*
* The length of the output array must be even.
*
* This is an inverse function of `fftRealSpectrum()`.
*
* @param x
*    An array of complex numbers that define the amplitudes and phases of the sinusoidal frequency components.
*    This corresponds to the normalized lower half of the FFT output.
*    It can include an additional entry for the nyquist frequency component.
*    If this array is longer than required, the extra values are ignored. If it is shorter, the missing values
*    are assumed to be zero.
* @param len
*    Output signal length. Must be even.
* @param inclNyquist
*    If `true`, the value at `x[len / 2]` is included in the inverse FFT.
* @returns
*    An array of real numbers that represent the signal which is the sum of the sinusoidal components.
*/
export function iFftRealHalfOpt (x: ComplexArray, len: number, inclNyquist = false) : Float64Array {
   if (len <= 0) {
      return new Float64Array(0); }
   if (len % 2 != 0) {
      throw new Error("output length is not even."); }
   const n = len / 2;
   const a1 = new ComplexArray(n);
   a1.re[0] = xRe(0);                                                // (x.im[0] has no effect on the result)
   a1.im[0] = xRe(0);
   if (inclNyquist) {
      a1.re[0] += xRe(n);
      a1.im[0] -= xRe(n); }
   const temp1 = new MutableComplex();
   const temp2 = new MutableComplex();
   const w = Math.PI / n;                                            // wave length is 2 * n
   for (let i = 1; i < n; i++) {
      const sRe = Math.sin(i * w);
      const sIm = Math.cos(i * w);
      temp1.setMul(xRe(i    ), xIm(i    ), (1 - sRe) / 2, sIm / 2);
      temp2.setMul(xRe(n - i), xIm(n - i), (1 + sRe) / 2, sIm / 2);
      a1.re[i] = temp1.re + temp2.re;
      a1.im[i] = temp1.im - temp2.im; }
   const a2 = fft(a1, false);                                        // complex inverse FFT with half the array size
   const a3 = new Float64Array(2 * n);
   for (let i = 0; i < n; i++) {                                     // unpack complex values into real array of twice the size
      a3[2 * i]     = a2.re[i];
      a3[2 * i + 1] = a2.im[i]; }
   return a3;
   function xRe (i: number) {
      return (i < x.length) ? x.re[i] : 0; }
   function xIm (i: number) {
      return (i < x.length) ? x.im[i] : 0; }}

/**
* Computes the inverse FFT for a real signal. General version.
*
* If `len` is even, the computation is faster. And if `len` is a power of 2, it's even faster.
*
* This is an inverse function of `fftRealSpectrum()`.
*
* @param x
*    An array of complex numbers that define the amplitudes and phases of the sinusoidal frequency components.
*    This corresponds to the normalized lower half of the FFT output.
*    It can include an additional entry for the nyquist frequency component.
*    If this array is longer than required, the extra values are ignored. If it is shorter, the missing values
*    are assumed to be zero.
* @param len
*    Output signal length. Must be even.
* @param inclNyquist
*    If `true`, the value at `x[len / 2]` is included in the inverse FFT.
* @returns
*    An array of real numbers that represent the signal which is the sum of the sinusoidal components.
*/
export function iFftRealHalf (x: ComplexArray, len: number, inclNyquist = false) : Float64Array {
   if (len % 2 == 0) {
      return iFftRealHalfOpt(x, len, inclNyquist); }
    else {
      return iFftRealHalfSimple(x, len, inclNyquist); }}
