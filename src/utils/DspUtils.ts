import * as ArrayUtils from "./ArrayUtils.ts";
import {MutableArrayLike} from "./MiscUtils.ts";

/**
* Converts a linear amplitude value to decibels.
* Returns -Infinity for 0.
*/
export function convertAmplitudeToDb (x: number) : number {
   return 20 * Math.log10(x); }

/**
* Converts a linear power value to decibels.
* Returns -Infinity for 0.
*/
export function convertPowerToDb (x: number) : number {
   return 10 * Math.log10(x); }

/**
* Converts a decibel value to a linear amplitude.
*/
export function convertDbToAmplitude (x: number) : number {
   return Math.pow(10, x / 20); }

/**
* Same as `convertDbToAmplitude()`, but converts the following values to 0:
*  - dB values below or equal to -99.
*  - Invalid numbers (NaN, 1/- Infinity).
*/
export function convertDbToAmplitudeOr0 (x: number) : number {
   return (!Number.isFinite(x) || x <= -99) ? 0 : convertDbToAmplitude(x); }

/**
* Converts a decibel value to a linear power.
*/
export function convertDbToPower (x: number) : number {
   return Math.pow(10, x / 10); }

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
