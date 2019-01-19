/**
* Autocorrelation functions.
*/

import * as WindowFunctions from "./WindowFunctions";
import * as ArrayUtils from "../utils/ArrayUtils";

function autocorrelationKernel (x: Float64Array, distance: number, n: number) : number {
   let sum = 0;
   for (let i = 0; i < n; i++) {
      sum += x[i] * x[i + distance]; }
   return sum; }

/**
* Computes the non-periodic autocorrelation for a single positive integer distance.
*
* @param x
*    The input signal.
* @param distance
*    A positive integer specifying the correlation distance.
* @param compensate
*    `true` to compensate for the narrowness of the overlap region.
* @returns
*    The autocorrelation amount at the specified distance.
*/
export function nonPeriodicAutocorrelationSingle (x: Float64Array, distance: number, compensate: boolean) : number {
   const n = x.length - distance;                          // number of overlapping values
   let sum = autocorrelationKernel(x, distance, n);
   if (compensate && n > 0) {
      sum *= x.length / n; }
   return sum; }

/**
* Finds the distance value with the highest autocorrelation.
*
* @param x
*    The input signal.
* @param minDistance
*    The minimum distance.
* @param maxDistance
*    The maximum distance.
* @param fixedOverlapWidth
*    `true` to use the fixed overlap width `x.length - maxDistance`.
* @returns
*    The distance with the highest autocorrelation within minDistance and maxDistance.
*/
export function findNonPeriodicAutocorrelationMaximum (x: Float64Array, minDistance: number, maxDistance: number, fixedOverlapWidth: boolean) : number {
   let maxVal = -Infinity;
   let maxPos = minDistance;
   for (let distance = minDistance; distance < maxDistance; distance++) {
      const val = fixedOverlapWidth ?
         autocorrelationKernel(x, distance, x.length - maxDistance) :
         nonPeriodicAutocorrelationSingle(x, distance, true);
      if (val > maxVal) {
         maxVal = val;
         maxPos = distance; }}
   return maxPos; }

/**
* Computes the non-periodic autocorrelation of a sampled signal.
*
* Only the right half side of the symetric autocorrelation result is computed.
*
* This is a simple reference implementation without any optimization.
*
* @param x
*    The input signal.
* @param normalize
*    `true` to divide the computed values by the value for distance 0.
* @returns
*    The non-periodic autocorrelation of the input signal.
*/
export function nonPeriodicAutocorrelation (x: Float64Array, normalize: boolean) : Float64Array {
   const n = x.length;
   const r = new Float64Array(n);
   for (let distance = 0; distance < n; distance++) {
      r[distance] = nonPeriodicAutocorrelationSingle(x, distance, true); }
   if (normalize && n > 0 && r[0] != 0) {
      const max = r[0];
      for (let distance = 0; distance < n; distance++) {
         r[distance] /= max; }}
   return r; }

/**
* Computes a windowed non-periodic autocorrelation of a sampled signal.
*
* Only the right half side of the symetric autocorrelation result is computed.
* The effect of windowing is compensated by dividing the result of the
* autocorrelation by the autocorrelation of the window function.
*
* This is a simple reference implementation without any optimization.
*
* @param x
*    The input signal.
* @param windowFunction
*    A window function to apply to the input signal.
* @param normalize
*    `true` to divide the computed values by the value for distance 0.
* @returns
*    The non-periodic autocorrelation of the input signal.
*/
export function windowedNonPeriodicAutocorrelation (x: Float64Array, windowFunction: WindowFunctions.WindowFunction, normalize: boolean) : Float64Array {
   const windowed = WindowFunctions.applyWindow(x, windowFunction);
   const autoCorr = nonPeriodicAutocorrelation(windowed, normalize);
   const window = WindowFunctions.getWindowTable(windowFunction, x.length);
   const windowAutoCorr = nonPeriodicAutocorrelation(window, true);
   const compensated = ArrayUtils.divide(autoCorr, windowAutoCorr);
   return compensated; }
