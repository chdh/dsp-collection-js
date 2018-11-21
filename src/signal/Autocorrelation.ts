/**
* Autocorrelation functions.
*/

import * as WindowFunctions from "./WindowFunctions";
import * as ArrayUtils from "../utils/ArrayUtils";

/**
* Computes the non-periodic autocorrelation for a single positive integer distance.
*
* @param x
*    The input signal.
* @param distance
*    A positive integer specifying the correlation distance.
* @param compensate
*    `true` to compensate for the narrowness of the overlap region.
* @return
*    The autocorrelation amount at the specified distance.
*/
export function nonPeriodicAutocorrelationSingle (x: Float64Array, distance: number, compensate: boolean) : number {
   const n = x.length - distance;
   let sum = 0;
   for (let i = 0; i < n; i++) {
      sum += x[i] * x[i + distance]; }
   if (compensate && n > 0) {
      sum *= x.length / n; }
   return sum; }

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
* @return
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
* @return
*    The non-periodic autocorrelation of the input signal.
*/
export function windowedNonPeriodicAutocorrelation (x: Float64Array, windowFunction: WindowFunctions.WindowFunction, normalize: boolean) : Float64Array {
   const windowed = WindowFunctions.applyWindow(x, windowFunction);
   const autoCorr = nonPeriodicAutocorrelation(windowed, normalize);
   const window = WindowFunctions.createArray(windowFunction, x.length);
   const windowAutoCorr = nonPeriodicAutocorrelation(window, true);
   const compensated = ArrayUtils.divideFloat64Arrays(autoCorr, windowAutoCorr);
   return compensated; }
