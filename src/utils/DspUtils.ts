/**
* DSP utility functions.
*
* @module
*/

import * as ArrayUtils from "./ArrayUtils.ts";
import {MutableArrayLike, NumericArray, allocNumericArrayLike} from "./MiscUtils.ts";
import {resampleSumPreserving} from "../signal/Resampling.ts";

/**
* Converts a linear amplitude value (magnitude) to decibels.
*
* Returns -Infinity for 0.
*/
export function convertAmplitudeToDb (x: number) : number {
   return 20 * Math.log10(x); }

/**
* Converts a linear power value to decibels.
*
* Returns -Infinity for 0.
*/
export function convertPowerToDb (x: number) : number {
   return 10 * Math.log10(x); }

/**
* Converts a decibel value to a linear amplitude (magnitude).
*/
export function convertDbToAmplitude (x: number) : number {
   return Math.pow(10, x / 20); }

/**
* Same as {@link convertDbToAmplitude} but with exceptions to generate 0 values.
*
* The following values are converted to 0:
*  - dB values below or equal to -99.
*  - Invalid numbers (NaN, 1/- Infinity).
*/
export function convertDbToAmplitudeOr0 (x: number) : number {
   return (!Number.isFinite(x) || x <= -99) ? 0 : convertDbToAmplitude(x); }

/**
* Converts a decibel value to a linear power value.
*/
export function convertDbToPower (x: number) : number {
   return Math.pow(10, x / 10); }

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
* Input and output are amplitude power values.
*
* @param spec
*    Input spectrum. An array containing amplitude power values.
* @param n
*    Size of output spectrum.
* @returns
*    The resampled output spectrum. An array containing amplitude power values.
*/
export function resamplePowerSpectrum <T extends NumericArray> (spec: T, n: number) : T {
   const spec1 = allocNumericArrayLike(spec, n);
   resampleSumPreserving(spec, spec1, true);
   const r = n / spec.length;                                                  // amplitude scaling factor
   const spec2 = spec1.map(x => x * r);
   return spec2; }

/**
* Resamples a magnitude spectrum.
*
* Input and output are linear amplitude magnitude values.
*
* @param spec
*    Input spectrum. An array containing linear amplitude magnitude values.
* @param n
*    Size of output spectrum.
* @returns
*    The resampled output spectrum. An array containing linear amplitude magnitude values.
*/
export function resampleSpectrum <T extends NumericArray> (spec: T, n: number) : T {
   const spec1 = spec.map(x => x * x);                                         // convert to power values
   const spec2 = resamplePowerSpectrum(spec1, n);
   const spec3 = spec2.map(Math.sqrt);                                         // back to magnitudes
   return spec3; }
