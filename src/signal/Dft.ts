/**
* Discrete Fourier transform (DFT).
*
* This module contains a collection of DFT-related functions.
*
* The `Goertzel` and `Fft` modules contain faster versions of some of the functions in this module.
*
* This module is mostly a reference implementation. It's used in the test programs to verify the output of the faster algorithms.
*/

import Complex from "../math/Complex.js";
import MutableComplex from "../math/MutableComplex.js";
import ComplexArray from "../math/ComplexArray.js";

/**
* Computes the DFT on an array of real numbers for a single frequency.
*
* This is a reference implementation without any optimization.
* It's simple to understand, but slow.
*
* @param x
*    The input values (samples).
* @param relativeFrequency
*    A frequency relative to `x.length`.
*    It represents the number of sinusoidal oscillations within `x`
*    and is normally within the range 0 (for DC) to `Math.floor((x.length - 1) / 2)`.
*    The absolute frequency is `relativeFrequency * samplingRate / x.length`.
* @returns
*    A complex number that corresponds to the amplitude and phase of a sinusoidal frequency component.
*    The amplitude can be normalized by mutliplying `1 / x.length` for DC and `2 / x.length`
*    for frequencies `> 0` and `< x.length / 2`.
*/
export function dftRealSingle (x: ArrayLike<number>, relativeFrequency: number) : MutableComplex  {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const w = -2 * Math.PI / n * relativeFrequency;
   const acc = new MutableComplex(0, 0);
   for (let p = 0; p < n; p++) {
      const c = Complex.fromPolar(x[p], w * p);
      acc.addTo(c); }
   return acc; }

/**
* Computes the DFT on an array of complex numbers for a single frequency.
*
* This is a reference implementation without any optimization.
* It's simple to understand, but slow.
*
* @param x
*    The complex input values.
* @param relativeFrequency
*    A frequency relative to `x.length`.
* @param direction
*    `true` for DFT (forward DFT), `false` for iDFT (inverse DFT).
* @returns
*    A complex number that corresponds to the amplitude and phase of the frequency component.
*/
export function dftSingle (x: ComplexArray, relativeFrequency: number, direction: boolean) : MutableComplex  {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const w = (direction ? -1 : 1) * 2 * Math.PI / n * relativeFrequency;
   const acc = new MutableComplex(0, 0);
   for (let p = 0; p < n; p++) {
      const c = MutableComplex.fromPolar(1, w * p);
      c.mulBy(x.get(p));
      acc.addTo(c); }
   return acc; }

/**
* Computes the DFT of an array of real numbers and returns the complex result.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers. It has the same size as the input array.
*    The upper half of the array contains complex conjugates of the lower half.
*/
export function dftReal (x: ArrayLike<number>) : ComplexArray {
   const n = x.length;
   const a = new ComplexArray(n);
   for (let frequency = 0; frequency < n; frequency++) {
      const c = dftRealSingle(x, frequency);
      a.set(frequency, c); }
   return a; }

/**
* Computes the lower half DFT of an array of real numbers and returns the complex result.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers. It's size is `Math.ceil(x.length / 2)`.
*/
export function dftRealHalf (x: ArrayLike<number>) : ComplexArray {
   const n = Math.ceil(x.length / 2);
   const a = new ComplexArray(n);
   for (let frequency = 0; frequency < n; frequency++) {
      const c = dftRealSingle(x, frequency);
      a.set(frequency, c); }
   return a; }

/**
* Computes the DFT of an array of complex numbers and returns the complex result.
*
* @param x
*    The complex input values.
* @param direction
*    `true` for DFT (forward DFT), `false` for iDFT (inverse DFT).
* @returns
*    An array of complex numbers. It has the same size as the input array.
*/
export function dft (x: ComplexArray, direction: boolean) : ComplexArray {
   const n = x.length;
   const a = new ComplexArray(n);
   for (let frequency = 0; frequency < n; frequency++) {
      const c = dftSingle(x, frequency, direction);
      a.set(frequency, c); }
   return a; }

/**
* Computes the complex spectrum of an array of real numbers.
* The result is the normalized lower half of the DFT.
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
export function dftRealSpectrum (x: ArrayLike<number>, inclNyquist = false) : ComplexArray {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const m = (n % 2 == 0 && inclNyquist) ? n / 2 + 1 : Math.ceil(n / 2);
   const a = new ComplexArray(m);
   for (let frequency = 0; frequency < m; frequency++) {
      const c = dftRealSingle(x, frequency);
      const r = (frequency == 0 || frequency == n / 2) ? 1 / n : 2 / n;
      c.mulByReal(r);
      a.set(frequency, c); }
   return a; }

/**
* Computes the inverse DFT of a complex spectrum and returns the result as an array of real numbers.
*
* This is the inverse function of `dftRealSpectrum()` with `inclNyquist == true`.
*
* This is a reference implementation without any optimization.
* It's simple to understand, but slow.
*
* @param x
*    An array of complex numbers that define the amplitudes and phases of the sinusoidal frequency components.
* @param len
*    Output signal length.
* @returns
*    The sampled signal that is the sum of the sinusoidal components.
*/
export function iDftRealSpectrum (x: ComplexArray, len: number) : Float64Array {
   const a = new Float64Array(len);
   for (let frequency = 0; frequency < x.length; frequency++) {
      const c = x.get(frequency);
      synthesizeSinusoidal(a, frequency, c.abs(), c.arg()); }
   return a; }

function synthesizeSinusoidal (a: Float64Array, frequency: number, amplitude: number, phase: number) {
   const n = a.length;
   const w = frequency * 2 * Math.PI / n;
   for (let p = 0; p < n; p++) {
      a[p] += amplitude * Math.cos(phase + w * p); }}
