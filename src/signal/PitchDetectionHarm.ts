/**
* Pitch detection using weighted sum of harmonic amplitudes.
*/

import * as MathUtils from "../math/MathUtils.js";
import * as NumApprox from "../math/NumApprox.js";
import * as WindowFunctions from "./WindowFunctions.js";
import * as AdaptiveStft from "./AdaptiveStft.js";
import * as InstFreq from "./InstFreq.js";

/**
* Parameters for evaluating the amplitude of a harmonic.
*/
export interface HarmonicAmplitudeEvaluationParms {

   /**
   * Exponent for the common compression of all harmonic amplitudes.
   */
   amplitudeCompressionExponent:       number;

   /**
   * Base value for a decline rate depending on the order of the harmonic.
   * Initial negative slope of the decline curve.
   */
   harmonicsDeclineRate:               number;

   /**
   * Hyperbolic decline exponent constant for the decline rate of the harmonic.
   *    1 for harmonic decline.
   *    0 for exponential decline.
   *    -1 for linear decline (with clipping to 0).
   *    Between 0 and 1 for hyperbolic decline.
   */
   harmonicsDeclineExponent:           number; }

/**
* Secondary parameters for `harmonicSum()`.
*/
export interface HarmonicSumParms extends HarmonicAmplitudeEvaluationParms {

   /**
   * Cutoff frequency in Hz. Specifies a hard upper frequency limit up to which the harmonic
   * amplitudes are evaluated.
   */
   fCutoff:                            number;

   /**
   * Window width, relative to the wavelength of the fundamental frequency.
   * Must be an integer.
   */
   relWindowWidth:                     number;

   /**
   * A window function or `undefined` for no windowing (i.e. for using a rectangular window).
   */
   windowFunction:                     WindowFunctions.WindowFunction | undefined; }

/**
* Secondary parameters for `harmonicInstSum()`.
*/
export interface HarmonicInstSumParms extends HarmonicSumParms {

   /**
   * Shift factor, relative to the wavelength of the frequency.
   * Used for measuring the phase delta for computing the instantaneous frequency.
   */
   shiftFactor:                        number;

   /**
   * Relative peak width factor. Used for peak shaping of a harmonic amplitude,
   * depending on the deviation from the instantaneous frequency.
   * Specifies the peak width relative to F0.
   */
   peakWidthFactor:                    number; }

/**
* Returns default values for the secondary parameters of `harmonicSum()`.
*/
export function getDefaultHarmonicSumParms() : HarmonicSumParms {
   return {
      amplitudeCompressionExponent:    0.5,
      harmonicsDeclineRate:            0.2,
      harmonicsDeclineExponent:        0,
      fCutoff:                         5000,
      relWindowWidth:                  16,
      windowFunction:                  WindowFunctions.getFunctionbyId("hann", {tableCacheCostLimit: 1}) }; }

/**
* Returns default values for the secondary parameters of `harmonicInstSum()`.
*/
export function getDefaultHarmonicInstSumParms() : HarmonicInstSumParms {
   return {
      ...getDefaultHarmonicSumParms(),
      shiftFactor:                     0.25,
      peakWidthFactor:                 0.2 }; }

/**
* Pitch salience function using a weighted sum of the harmonic amplitudes.
*
* Calculates a measure for a pitch at a given fundamental frequency by
* calculating a weighted sum of the amplitudes of its harmonics.
*
* Note that this is a CPU intensive pitch detection algorithm.
*
* @param samples
*    The input signal.
* @param sampleRate
*    The sample rate of the input signal.
*    This parameter is only relevant for the parameters `f0` and `parms.fCutoff`. To use normalized
*    frequencies instead, a sample rate of 1 can be specified.
* @param position
*    Position in the input signal where the pitch is to be estimated.
*    Center position of the window.
*    In seconds.
* @param f0
*    The fundamental frequency (in Hz) to be evaluated.
* @param parms
*    Optional secondary parameters, which have default values.
* @returns
*    A measure for a pitch perception at the specified fundamental frequency.
*    Or NaN if the pitch cannot be computed.
*/
export function harmonicSum (samples: Float64Array, sampleRate: number, position: number, f0: number,
      parms = getDefaultHarmonicSumParms()) : number {
   const n = Math.floor(parms.fCutoff / f0);
   const a = AdaptiveStft.getHarmonicAmplitudes(samples, position * sampleRate, f0 / sampleRate, n, parms.relWindowWidth, parms.windowFunction);
   if (!a) {
      return NaN; }
   return evaluateHarmonicAmplitudes(a, parms); }

/**
* Pitch salience function using a weighted sum of the harmonic amplitudes, enhanced with peak shaping
* based on instantaneous frequencies.
*
* This function is similar to `harmonicSum`, but enhances the result by taking into account the
* intantaneous frequencies at the harmonic frequency positions.
* The accuracy of the pitch frequency estimation is improved, but at the cost of a slower execution.
*
* Note that this is a CPU intensive pitch detection algorithm.
*
* @param samples
*    The input signal.
* @param sampleRate
*    The sample rate of the input signal.
*    This parameter is only relevant for the parameters `f0` and `parms.fCutoff`. To use normalized
*    frequencies instead, a sample rate of 1 can be specified.
* @param position
*    Position in the input signal where the pitch is to be estimated.
*    Center position of the window.
*    In seconds.
* @param f0
*    The fundamental frequency (in Hz) to be evaluated.
* @param parms
*    Optional secondary parameters, which have default values.
* @returns
*    A measure for a pitch perception at the specified fundamental frequency.
*    Or NaN if the pitch cannot be computed.
*/
export function harmonicInstSum (samples: Float64Array, sampleRate: number, position: number, f0: number,
      parms = getDefaultHarmonicInstSumParms()) : number {
   const peakWidth = f0 * parms.peakWidthFactor / sampleRate;
   const n = Math.floor(parms.fCutoff / f0);
   let sum = 0;
   let count = 0;
   for (let harmonic = 1; harmonic <= n; harmonic++) {
      const f = harmonic * f0 / sampleRate;
      const r = InstFreq.instFreqSingle_relWindow(samples, position * sampleRate, f, parms.shiftFactor, parms.relWindowWidth * harmonic, parms.windowFunction);
      if (r) {
         const absDelta = Math.abs(r.measuringFrequency - r.instFrequency);
         const a = r.amplitude * Math.max(0, 1 - (2 * absDelta) / peakWidth);
         sum += evaluateHarmonicAmplitude(a, harmonic, parms);
         count++; }}
   return (count > 0) ? sum : NaN; }

/**
* Evaluates the amplitude of a harmonic and returns it's contribution for the weighted sum.
*
* @param amplitude
*    The linear amplitude of the harmonic, or a pre-processed value to be used instead.
* @param harmonic
*    The order of the harmonic. 1 for the fundamental frequency (F0).
* @param parms
*    Calculation constants.
* @returns
*    A measure for the importance of this harmonic for a pitch perception at the fundamental frequency.
*/
export function evaluateHarmonicAmplitude (amplitude: number, harmonic: number, parms: HarmonicAmplitudeEvaluationParms) : number {
   const attenuation = MathUtils.hyperbolicDecline(harmonic - 1, parms.harmonicsDeclineRate, parms.harmonicsDeclineExponent);
   return amplitude ** parms.amplitudeCompressionExponent * attenuation; }

function evaluateHarmonicAmplitudes (amplitudes: Float64Array, parms: HarmonicAmplitudeEvaluationParms) : number {
   let sum = 0;
   for (let harmonic = 1; harmonic <= amplitudes.length; harmonic++) {
      sum += evaluateHarmonicAmplitude(amplitudes[harmonic - 1], harmonic, parms); }
   return sum; }

/**
* Searches the argument for the maximum of a given pitch salience function.
* First it scans over the F0 range to find the approximate position of the maximum.
* Then it uses golden-section search to improve the result.
*
* @param salienceFunction
*    A pitch salience function.
* @param f0Min
*    Lower pitch frequency limit.
* @param f0Max
*    Upper pitch frequency limit.
* @param scanFactor
*    Optional constant for the the scan for the maximum.
* @returns
*    The estimated pitch frequency.
*/
export function findPitchSalienceFunctionArgMax (salienceFunction: (f0: number) => number, f0Min: number, f0Max: number,
      {scanFactor = 1.005, relTolerance = 1E-3, absTolerance = 0.05} = {}) : number {
   const f1 = NumApprox.argMax_scanGeom(salienceFunction, f0Min, f0Max, scanFactor);
   if (!isFinite(f1)) {
      return NaN; }
   const f1Lo = Math.max(f1 / scanFactor, f0Min);
   const f1Hi = Math.min(f1 * scanFactor, f0Max);
   const tolerance = Math.min(f1 * relTolerance, absTolerance);
   return NumApprox.argMax_goldenSectionSearch(salienceFunction, f1Lo, f1Hi, tolerance); }

/**
* Estimates the pitch frequency of a signal by using the `harmonicSum()` salience function.
*
* @param samples
*    The input signal.
* @param sampleRate
*    The sample rate of the input signal.
* @param position
*    Position in the input signal where the pitch is to be estimated.
*    Center position of the windows used for the frequency measurement.
*    In seconds.
* @param f0Min
*    Lower pitch frequency limit in Hz.
* @param f0Max
*    Upper pitch frequency limit in Hz.
* @param parms
*    Optional secondary parameters, which have default values.
* @returns
*    The estimated pitch frequency in Hz.
*/
export function estimatePitch_harmonicSum (samples: Float64Array, sampleRate: number, position: number, f0Min: number = 75, f0Max: number = 900,
      parms = getDefaultHarmonicSumParms()) : number {
   const salienceFunction = (f0: number) => harmonicSum(samples, sampleRate, position, f0, parms);
   return findPitchSalienceFunctionArgMax(salienceFunction, f0Min, f0Max); }
