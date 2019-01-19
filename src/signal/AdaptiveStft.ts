/**
* Adaptive short-time fourier transform (ASTFT).
*
* This module contains functions that improve the frequency resolution of the
* classic STFT by using a variable width window. While the frequency resolution
* does not get sharper by varying the window width, it allows the computation
* of finer intermediate frequency components than with the classical method.
*/

import Complex from "../math/Complex";
import * as Goertzel from "./Goertzel";
import * as WindowFunctions from "./WindowFunctions";

export interface ComponentResult {
   component:                Complex;                      // amplitude+phase of the sine wave component
   frequency:                number;                       // exact frequency (normalized) used to compute the component
   windowStartPosition:      number;                       // start position of the window used
   windowWidth:              number; }                     // width of the window used

/**
* Computes a short time fourier transform for a single sine wave component, by
* using a window size that corresponds to a fixed number of oscillation cycles.
*
* The window is defined by its center position, the number of oscillation cycles and
* the frequency.
*
* @param samples
*    The input signal.
* @param roughFrequency
*    The rough frequency of the sine wave component to be computed.
*    The specified value is adjusted to the nearest value that allows a computation without subsampling.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param roughWindowCenterPosition
*    The rough center position of the window (in sample positions).
* @param relWindowWidth
*    Window width relative the the wavelength.
*    An integer specifying the number of oscillation cycles to be used for the window width.
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @returns
*    The result structure, or `undefined` if the result cannot be computed.
*/
export function getSingle_relWindow (samples: Float64Array, roughFrequency: number, roughWindowCenterPosition: number,
      relWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : ComponentResult | undefined {
   if (roughFrequency <= 0 || roughFrequency >= 0.5 || relWindowWidth < 1) {
      return; }
   if (!Number.isInteger(relWindowWidth)) {
      throw new Error("Parameter relWindowWidth is not an integer."); }
   const windowWidth = Math.round(relWindowWidth / roughFrequency);
   const windowStartPosition = Math.round(roughWindowCenterPosition - windowWidth / 2);
   if (windowStartPosition < 0 || windowStartPosition + windowWidth > samples.length) {
      return; }
   const windowSamples = samples.subarray(windowStartPosition, windowStartPosition + windowWidth);
   const windowedSamples = windowFunction ? WindowFunctions.applyWindow(windowSamples, windowFunction) : windowSamples;
   const component0 = Goertzel.goertzelSingle(windowedSamples, relWindowWidth);
   const componentNormalized = component0.mulReal(2 / windowWidth);
   const componentPhaseAdjusted = (relWindowWidth % 2 == 1) ? componentNormalized.neg() : componentNormalized;
   return {
      component:             componentPhaseAdjusted,
      frequency:             relWindowWidth / windowWidth,
      windowStartPosition:   windowStartPosition,
      windowWidth:           windowWidth }; }

/**
* Computes a variable width short time fourier transform for a single sine
* wave component, by optimally utilizing a given maximum window width.
*
* The largest possible window is used that corresponds to an integral number
* of oscillations of the specified frequency.
*
* @param samples
*    The input signal.
* @param roughFrequency
*    The rough frequency of the sine wave component to be computed.
*    The specified value is adjusted to the nearest value that allows a computation without subsampling.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param roughWindowCenterPosition
*    The rough center position of the window (in sample positions).
* @param maxWindowWidth
*    The maximum window width (in sample positions).
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @returns
*    The result structure, or `undefined` if the result cannot be computed.
*/
export function getSingle_maxWindow (samples: Float64Array, roughFrequency: number, roughWindowCenterPosition: number,
      maxWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : ComponentResult | undefined {
   const relWindowWidth = Math.floor(maxWindowWidth * roughFrequency);
      // number of complete oscillations that fit within the maximum window width
   return getSingle_relWindow(samples, roughFrequency, roughWindowCenterPosition, relWindowWidth, windowFunction); }

/**
* A simplified version of `getSingle_maxWindow()`.
* The maximum window width covers the entire input signal.
*
* @param samples
*    The input signal.
* @param roughFrequency
*    The rough frequency of the sine wave component to be computed.
*    The specified value is adjusted to the nearest value that allows a computation without subsampling.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @returns
*    A complex value that represents the amplitude and phase of the sine wave component, or Complex.NaN.
*/
export function getSingle (samples: Float64Array, roughFrequency: number, windowFunction: WindowFunctions.WindowFunction | undefined) : Complex {
   const r = getSingle_maxWindow(samples, roughFrequency, samples.length / 2, samples.length, windowFunction);
   return r ? r.component : Complex.NaN; }

/**
* Computes the amplitudes of the harmonic components for a specified fundamental frequency.
*
* @param samples
*    The input signal.
* @param windowCenterPosition
*    The center position of the window (in sample positions).
* @param f0
*    The fundamental frequency.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param harmonics
*    The number of harmonics to compute.
* @param relWindowWidth
*    An integer specifying the window width relative to the wavelength of the fundamental frequency. Optional.
* @param windowFunction
*    A window function. Optional.
* @returns
*    An array with the amplitudes of the harmonics, starting with the fundamental frequency.
*    a[0] = amplitude of fundamental frequency, a[i] = amplitude of harmonic i+1 with the frequency `f0 * (i + 1)`.
*    `undefined` is returned if the amplitudes cannot be computed.
*/
export function getHarmonicAmplitudes (samples: Float64Array, windowCenterPosition: number, f0: number, harmonics: number, relWindowWidth = 7, windowFunction = WindowFunctions.flatTopWindowNorm) : Float64Array | undefined {
   if (!isFinite(f0) || f0 <= 0) {
      return; }
   if (!Number.isInteger(relWindowWidth)) {
      throw new Error("Parameter relWindowWidth is not an integer."); }
   const windowWidth = Math.round(relWindowWidth / f0);
   const windowStartPosition = Math.round(windowCenterPosition - windowWidth / 2);
   if (windowStartPosition < 0 || windowStartPosition + windowWidth > samples.length || windowWidth <= 0) {
      return; }
   const windowSamples = samples.subarray(windowStartPosition, windowStartPosition + windowWidth);
   const windowedSamples = WindowFunctions.applyWindow(windowSamples, windowFunction);
   const amplitudes = new Float64Array(harmonics);
   for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
      const c = Goertzel.goertzelSingle(windowedSamples, harmonic * relWindowWidth);
      const amplitude = c.abs() * 2 / windowWidth;
      amplitudes[harmonic - 1] = amplitude; }
   return amplitudes; }
