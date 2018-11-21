/**
* Adaptive short-time fourier transform (STFT).
*
* This module contains functions that improve the frequency resolution of the
* classic STFT by using a variable width window. While the frequency resolution
* does not get sharper by varying the window width, it allows the computation
* of finer intermediate frequency components than with the classic method.
*/

import Complex from "../math/Complex";
import * as Goertzel from "./Goertzel";
import * as WindowFunctions from "../signal/WindowFunctions";

/**
* Computes a variable width short time fourier transform for a single sine
* wave component, by using a window size that corresponds to a fixed number of
* oscillations.
*
* The window is defined by its center position, the number of oscillations and
* the wavelength.
*
* @param samples
*    The input signal.
* @param waveLength
*    The wavelength (in sample positions) of the sine component to be computed.
*    It can be a non-integer number, but it is rounded to the nearest value
*    that allows a computation without subsampling.
* @param windowCenterPosition
*    The center position of the window (in sample positions).
* @param oscillations
*    An integer indicating the number of oscillations to be used to determine the window width.
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @return
*    A value that represents the amplitude and phase of the wave component.
*/
export function stftSingleFixedOsc (samples: Float64Array, waveLength: number, windowCenterPosition: number,
      oscillations: number, windowFunction: WindowFunctions.WindowFunction | undefined) : Complex {
   if (waveLength <= 2 || oscillations < 1) {
      return Complex.NaN; }
   const oscLen = Math.round(oscillations * waveLength);             // Math.round() adjusts non-integer `waveLength` values
   const oscPos = Math.round(windowCenterPosition - oscLen / 2);
   if (oscPos < 0 || oscPos + oscLen > samples.length) {
      return Complex.NaN; }
   let oscSamples = samples.subarray(oscPos, oscPos + oscLen);
   if (windowFunction) {
      oscSamples = WindowFunctions.applyWindow(oscSamples, windowFunction); }
   const component = Goertzel.goertzelSingle(oscSamples, oscillations);
   const componentNormalized = component.mulReal(2 / oscLen);
   const componentPhaseAdjusted = (oscillations % 2 == 1) ? componentNormalized.neg() : componentNormalized;
   return componentPhaseAdjusted; }

/**
* Computes a variable width short time fourier transform for a single sine
* wave component, by optimally utilizing a given maximum window size.
*
* The largest possible window is used that corresponds to an integral number
* of oscillations of the specified wavelength.
*
* @param samples
*    The input signal.
* @param waveLength
*    The wavelength (in sample positions) of the sine component to be computed.
*    It can be a non-integer number, but it is rounded to the nearest value
*    that allows a computation without subsampling.
* @param windowCenterPosition
*    The center position of the window (in sample positions).
* @param maxWindowWidth
*    The maximum window width (in sample positions).
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @return
*    A value that represents the amplitude and phase of the wave component.
*/
export function stftSingleMaxWindow (samples: Float64Array, waveLength: number, windowCenterPosition: number,
      maxWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : Complex {
   if (waveLength <= 2) {
      return Complex.NaN; }
   const oscillations = Math.floor(maxWindowWidth / waveLength);     // number of complete oscillations that fit within the maximum window width
   return stftSingleFixedOsc(samples, waveLength, windowCenterPosition, oscillations, windowFunction); }

/**
* Same as `stftSingleMaxWindow()`, but the maximum window width covers the entire
* input signal.
*
* @param samples
*    The input signal.
* @param waveLength
*    The wavelength (in sample positions) of the sine component to be computed.
*    It can be a non-integer number, but it is rounded to the nearest value
*    that allows a computation without subsampling.
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @return
*    A value that represents the amplitude and phase of the wave component.
*/
export function stftSingleMaxWindow2 (samples: Float64Array, waveLength: number, windowFunction: WindowFunctions.WindowFunction | undefined) : Complex {
   return stftSingleMaxWindow(samples, waveLength, samples.length / 2, samples.length, windowFunction); }
