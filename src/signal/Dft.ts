/**
* Discrete Fourier transform (DFT).
*
* This module contains a collection of DFT-related functions.
*
* The `Goertzel` and `Fft` modules contain faster versions of some of the functions in this module.
*/

import Complex from "../math/Complex";
import MutableComplex from "../math/MutableComplex";

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
export function dftRealSingle (x: Float64Array, relativeFrequency: number) : MutableComplex  {
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
export function dftSingle (x: Complex[], relativeFrequency: number, direction: boolean) : MutableComplex  {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const w = (direction ? -1 : 1) * 2 * Math.PI / n * relativeFrequency;
   const acc = new MutableComplex(0, 0);
   for (let p = 0; p < n; p++) {
      const c = MutableComplex.fromPolar(1, w * p);
      c.mulBy(x[p]);
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
export function dftReal (x: Float64Array) : MutableComplex[] {
   const n = x.length;
   const r : MutableComplex[] = Array(n);
   for (let frequency = 0; frequency < n; frequency++) {
      r[frequency] = dftRealSingle(x, frequency); }
   return r; }

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
export function dft (x: Complex[], direction: boolean) : MutableComplex[] {
   const n = x.length;
   const r : MutableComplex[] = Array(n);
   for (let frequency = 0; frequency < n; frequency++) {
      r[frequency] = dftSingle(x, frequency, direction); }
   return r; }

/**
* Computes the complex spectrum of an array of real numbers.
* The result is the normalized lower half of the DFT.
*
* If `x.length` is even, the value for the relative frequency `x.length / 2`
* (Nyquist frequency, half the sampling frequency) is included in the output array.
* This is done to allow an exact re-synthesis of the original signal from the spectrum.
* But this value does not represent the phase and amplitude of that frequency.
* The phase of this value is always 0.
* It's not possible to compute the proper value for the Nyquist frequency.
*
* @param x
*    The input values (samples).
* @returns
*    An array of complex numbers that represent spectrum of the input signal.
*/
export function dftRealSpectrum (x: Float64Array) : MutableComplex[] {
   const n = x.length;
   if (n == 0) {
      throw new Error("Input array must not be empty."); }
   const maxFrequency = Math.floor(n / 2);
   const r : MutableComplex[] = Array(maxFrequency + 1);
   for (let frequency = 0; frequency <= maxFrequency; frequency++) {
      const c = dftRealSingle(x, frequency);
      if (frequency == 0 || frequency == n / 2) {
         c.divByReal(n); }
       else {
         c.mulByReal(2 / n); }
      r[frequency] = c; }
   return r; }

/**
* Computes the inverse DFT of a complex spectrum
* and returns the result as an array of real numbers.
*
* This is the inverse function of [[dftRealSpectrum()]].
*
* This is a reference implementation without any optimization.
* It's simple to understand, but slow.
*
* @param x
*    An array of complex numbers that define the amplitudes and phases of the sinusoidal frequency components.
* @param odd
*    If `odd` is `true`, `2 * x.length - 1` output values are generated.
*    Otherwise `2 * x.length - 2` output values are generated.
* @returns
*    The sampled signal that is the sum of the sinusoidal components.
*/
export function iDftRealSpectrum (x: Complex[], odd: boolean) : Float64Array {
   const n = x.length;
   const len = n * 2 - (odd ? 1 : 2);
   const r = new Float64Array(len);
   for (let frequency = 0; frequency < n; frequency++) {
      const f = x[frequency];
      synthesizeSinusoidal(r, frequency, f.abs(), f.arg()); }
   return r; }

function synthesizeSinusoidal (a: Float64Array, frequency: number, amplitude: number, phase: number) {
   const n = a.length;
   const w = 2 * Math.PI / n * frequency;
   for (let p = 0; p < n; p++) {
      a[p] += amplitude * Math.cos(phase + w * p); }}
