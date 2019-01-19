/**
* Instantaneous frequency computation.
*
* The instantaneous frequency is calculated by comparing the phases of a
* specified frequency (measuring frequency) at two closely spaced points in time.
*/

import * as WindowFunctions from "./WindowFunctions";
import * as AdaptiveStft from "./AdaptiveStft";

export interface InstFreqSingleResult {
   instFrequency:            number;                       // instantaneous frequency (normalized)
   measuringFrequency:       number;                       // exact measuring frequency
   amplitude:                number; }                     // sine wave component amplitude of measuring frequency

/**
* Computes the instantaneous frequency for a single measuring frequency.
* For this version, the window width is specified relative to the wavelength.
*
* @param samples
*    The input signal.
* @param position
*    The rough position where to measure the instantaneous frequency.
*    This is the rough center position of the window.
* @param roughtMeasuringFrequency
*    A rough value for the measuring frequency.
*    The specified value is adjusted to the nearest value that allows a computation without subsampling.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param shiftFactor
*    Shift factor, relative to the wavelength of the frequency.
*    This shift is used for measuring the phase delta.
*    A reasonable value is 0.25, which corresponds to 1/4 of the wavelength of the measuring frequency.
* @param relWindowWidth
*    Window width relative the the wavelength.
*    An integer specifying the number of oscillation cycles of the measuring frequency to be used for the window width.
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @returns
*    The result structure, or `undefined` if the instantaneous frequency cannot be computed.
*/
export function instFreqSingle_relWindow (samples: Float64Array, position: number, roughtMeasuringFrequency: number, shiftFactor: number,
      relWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : InstFreqSingleResult | undefined {
   const shiftDistance = Math.max(1, shiftFactor / roughtMeasuringFrequency);
   const pos1 = position - shiftDistance / 2;
   const pos2 = position + shiftDistance / 2;
   const r1 = AdaptiveStft.getSingle_relWindow(samples, roughtMeasuringFrequency, pos1, relWindowWidth, windowFunction);
   const r2 = AdaptiveStft.getSingle_relWindow(samples, roughtMeasuringFrequency, pos2, relWindowWidth, windowFunction);
   if (!r1 || !r2) {
      return; }
   if (r1.frequency != r2.frequency || r1.windowStartPosition >= r2.windowStartPosition || r1.windowWidth != r2.windowWidth) {
      throw new Error(); }
   const measuringFrequency = r1.frequency;
   const realShiftDistance = r2.windowStartPosition - r1.windowStartPosition;
   const phase1 = r1.component.arg();
   const phase2 = r2.component.arg();
   const phaseDelta = (phase2 + 2 * Math.PI - phase1) % (2 * Math.PI);
   const instFrequency = phaseDelta / (2 * Math.PI) / realShiftDistance;
   const amplitude = (r1.component.abs() + r2.component.abs()) / 2;            // rough center amplitude
   return {instFrequency, measuringFrequency, amplitude}; }

/**
* Computes the instantaneous frequency for a single measuring frequency.
* For this version, the maximum window width is specified.
*
* @param samples
*    The input signal.
* @param position
*    The rough position where to measure the instantaneous frequency.
*    This is the rough center position of the window.
* @param roughtMeasuringFrequency
*    A rough value for the measuring frequency.
*    The specified value is adjusted to the nearest value that allows a computation without subsampling.
*    The unit of the specified frequency value is 1/samples (normalized frequency).
* @param shiftFactor
*    Shift factor, relative to the wavelength of the frequency.
*    This shift is used for measuring the phase delta.
*    A reasonable value is 0.25, which corresponds to 1/4 of the wavelength of the measuring frequency.
* @param maxWindowWidth
*    The maximum window width (in sample positions).
* @param windowFunction
*    A window function or `undefined` for no windowing (i.e. for using a rectangular window).
* @returns
*    The result structure, or `undefined` if the instantaneous frequency cannot be computed.
*/
export function instFreqSingle_maxWindow (samples: Float64Array, position: number, roughtMeasuringFrequency: number, shiftFactor: number,
      maxWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : InstFreqSingleResult | undefined {
   const relWindowWidth = Math.floor(maxWindowWidth * roughtMeasuringFrequency);
   return instFreqSingle_relWindow(samples, position, roughtMeasuringFrequency, shiftFactor, relWindowWidth, windowFunction); }
