/**
* Discrete Fourier transform (DFT) with the Goertzel algorithm.
*/

import Complex from "../math/Complex";
import MutableComplex from "../math/MutableComplex";
import ComplexArray from "../math/ComplexArray";

/**
* Computes the DFT on an array of real numbers for a single frequency.
*
* @param x
*    The input values (samples).
* @param relativeFrequency
*    A frequency relative to `x.length`.
*    It represents the number of sinusoidal oscillations within `x`
*    and is normally an integer within the range 0 (for DC) to `Math.floor((x.length - 1) / 2)`.
*    The absolute frequency is `relativeFrequency * samplingRate / x.length`.
* @returns
*    A complex number that corresponds to the amplitude and phase of a sinusoidal frequency component.
*    The amplitude can be normalized by mutliplying `1 / x.length` for DC and `2 / x.length`
*    for frequencies `> 0` and `< x.length / 2`.
*/
export function goertzelSingle (x: Float64Array, relativeFrequency: number) : MutableComplex {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const w = 2 * Math.PI / n * relativeFrequency;
   const c = Complex.expj(w);
   const cr2 = c.re * 2;
   let s1 = 0;
   let s2 = 0;
   for (let p = 0; p < n; p++) {
      const s0 = x[p] + cr2 * s1 - s2;
      s2 = s1;
      s1 = s0; }
   return new MutableComplex(c.re * s1 - s2, c.im * s1); }

/**
* Computes the DFT of an array of real numbers and returns the complex result.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers. It has the same size as the input array.
*    The upper half of the array contains complex conjugates of the lower half.
*/
export function goertzel (x: Float64Array) : ComplexArray {
   const n = x.length;
   const a = new ComplexArray(n);
   for (let frequency = 0; frequency < n; frequency++) {
      const c = goertzelSingle(x, frequency);
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
export function goertzelSpectrum (x: Float64Array, inclNyquist = false) : ComplexArray {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const m = (n % 2 == 0 && inclNyquist) ? n / 2 + 1 : Math.ceil(n / 2);
   const a = new ComplexArray(m);
   for (let frequency = 0; frequency < m; frequency++) {
      const c = goertzelSingle(x, frequency);
      if (frequency == 0 || frequency == n / 2) {
         c.divByReal(n); }
       else {
         c.mulByReal(2 / n); }
      a.set(frequency, c); }
   return a; }
