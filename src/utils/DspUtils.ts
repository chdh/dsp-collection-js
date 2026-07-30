/**
* DSP utility functions.
*
* @module
*/

import * as ArrayUtils from "./ArrayUtils.ts";
import {MutableArrayLike} from "./MiscUtils.ts";
import {resampleSumPreserving} from "../signal/Resampling.ts";

//--- Value conversion functions -----------------------------------------------

/**
* Converts a magnitude value (a linear amplitude) to dB.
*
* Returns -Infinity for 0.
*/
export function convertMagnitudeToDb (x: number) : number {
   return 20 * Math.log10(x); }

/**
* @deprecated Use `convertMagnitudeToDb` instead.
*/
export const convertAmplitudeToDb = convertMagnitudeToDb;

/**
* Converts a linear power value to decibels.
*
* Returns -Infinity for 0.
*/
export function convertPowerToDb (x: number) : number {
   return 10 * Math.log10(x); }

/**
* Converts a dB value to a magnitude value (a linear amplitude).
*/
export function convertDbToMagnitude (x: number) : number {
   return Math.pow(10, x / 20); }

/**
* @deprecated Use `convertDbToMagnitude` instead.
*/
export const convertDbToAmplitude = convertDbToMagnitude;

/**
* Same as {@link convertDbToMagnitude} but with exceptions to return 0 values.
*
* The following values are converted to 0:
*  - dB values below or equal to -99.
*  - Invalid numbers (NaN, +/- Infinity).
*/
export function convertDbToMagnitudeOr0 (x: number) : number {
   return (!Number.isFinite(x) || x <= -99) ? 0 : convertDbToMagnitude(x); }

/**
* @deprecated Use `convertDbToMagnitudeOr0` instead.
*/
export const convertDbToAmplitudeOr0 = convertDbToMagnitudeOr0;

/**
* Converts a dB value to a linear power value.
*/
export function convertDbToPower (x: number) : number {
   return Math.pow(10, x / 10); }

/**
* Same as {@link convertDbToPower} but with exceptions to return 0 values.
*
* The following values are converted to 0:
*  - dB values below or equal to -99.
*  - Invalid numbers (NaN, +/- Infinity).
*/
export function convertDbToPowerOr0 (x: number) : number {
   return (!Number.isFinite(x) || x <= -99) ? 0 : convertDbToPower(x); }

//------------------------------------------------------------------------------

/**
* Options for {@link adjustSignalLevel}.
*/
export interface AdjustSignalLevelOptions {

   /**
   * If set, scale so the RMS reaches this value.
   */
   targetRms?:               number;

   /**
   * If set, scale so the peak samples reach this value (e.g. 0.999).
   */
   targetMaxLevel?:          number;

   /**
   * If set, hard-clip samples to this value after scaling (e.g. 0.999).
   */
   clippingLevel?:           number; }

/**
* Scales `signal` in place and optionally clips it.
*
* If both `targetRms` and `targetMaxLevel` are given, the more restrictive (smaller) factor is used,
* so neither target is exceeded. Clipping, if enabled, is applied after scaling.
* A target of 0 (or omitted) is treated as "not specified".
*/
export function adjustSignalLevel (signal: MutableArrayLike<number>, options: AdjustSignalLevelOptions) {
   const n = signal.length;
   if (!n) {
      return; }

   let rmsFactor = Infinity;
   if (options.targetRms) {
      const rms = ArrayUtils.rms(signal);
      if (rms) {
         rmsFactor = options.targetRms / rms; }}

   let maxLevelFactor = Infinity;
   if (options.targetMaxLevel) {
      const maxAbs = ArrayUtils.maxAbs(signal);
      if (maxAbs) {
         maxLevelFactor = options.targetMaxLevel / maxAbs; }}

   const factor = Math.min(rmsFactor, maxLevelFactor);
   if (isFinite(factor) && Math.abs(factor - 1) > 1E-6) {
      for (let i = 0; i < n; i++) {
         signal[i] *= factor; }}

   const clippingLevel = options.clippingLevel ?? 0;
   if (clippingLevel) {
      for (let i = 0; i < n; i++) {
         const v = signal[i];
         if (v > clippingLevel) {
            signal[i] = clippingLevel; }
          else if (v < -clippingLevel) {
            signal[i] = -clippingLevel; }}}}

/**
* Resamples a power spectrum.
*
* Input and output are arrays of power amplitude values.
*
* Input and output spectrum span the same frequency range,
* subdivided into a different number of frequency bins.
* The spectrum may cover any contiguous frequency band.
*
* The spectral levels are preserved: A value at a given
* frequency remains at the same level in the output.
* The total power is not preserved.
*
* **Frequency mapping**: Bin centers are aligned. Input bin `i` and
* output bin `k` represent the frequencies `i * fRange / spec.length`
* and `k * fRange / n`, where `fRange` is the frequency range spanned
* by the spectrum. Bin 0 of the input maps exactly to bin 0 of
* the output.
* Each bin is treated as covering an interval of one bin width,
* centered at its frequency. At both ends of the spectrum, up to
* half a bin width of the outermost intervals lies outside the
* spectrum and is treated as zero. When downsampling, the levels
* of the first and last output bin are therefore biased low.
*
* @param spec
*    Input spectrum. An array containing power amplitude values.
* @param n
*    Size of output spectrum.
* @returns
*    The resampled output spectrum. An array containing power amplitude values.
*/
export function resamplePowerSpectrum (spec: ArrayLike<number>, n: number) : Float64Array {
   const spec1 = new Float64Array(n);
   resampleSumPreserving(spec, spec1, true);
   const r = n / spec.length;                                                  // amplitude scaling factor
   const spec2 = spec1.map(x => x * r);
   return spec2; }

/**
* Resamples a magnitude spectrum.
*
* Input and output are arrays of linear amplitude magnitude values.
*
* Refer to {@link resamplePowerSpectrum} for details.
*
* @param spec
*    Input spectrum. An array containing linear amplitude magnitude values.
* @param n
*    Size of output spectrum.
* @returns
*    The resampled output spectrum. An array containing linear amplitude magnitude values.
*/
export function resampleMagnitudeSpectrum (spec: ArrayLike<number>, n: number) : Float64Array {
   const spec1 = Float64Array.from(spec, x => x * x);                          // convert to power values
   const spec2 = resamplePowerSpectrum(spec1, n);
   const spec3 = spec2.map(Math.sqrt);                                         // back to magnitudes
   return spec3; }

/**
* Resamples a dB spectrum.
*
* Input and output are arrays of logarithmic dB amplitude values.
*
* Refer to {@link resamplePowerSpectrum} for details.
*
* @param spec
*    Input spectrum. An array containing logarithmic dB amplitude values.
* @param n
*    Size of output spectrum.
* @returns
*    The resampled output spectrum. An array containing logarithmic dB amplitude values.
*/
export function resampleDbSpectrum (spec: ArrayLike<number>, n: number) : Float64Array {
   const spec1 = Float64Array.from(spec, convertDbToPowerOr0);                 // convert to power values
   const spec2 = resamplePowerSpectrum(spec1, n);
   const spec3 = spec2.map(convertPowerToDb);                                  // back to dB
   return spec3; }
