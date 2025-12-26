/**
* Spectral filtering.
*
* Refer to the browser-based SpecFilt application for a test bed for spectral filtering.
*/

import ComplexArray from "../math/ComplexArray.ts";
import * as Fft from "../signal/Fft.ts";

export const enum FilterType {
   lowPass  = "LP",
   highPass = "HP",
   bandPass = "BP",
   bandStop = "BS" }

export type FilterCurveFunction = (frequency: number) => number;

// A symetric Hann-like function is used for the smoothing, so that overlapping band filtered regions can be added without loss of total power.
function smoothingFunction (x: number) : number {
   return (Math.sin(x * Math.PI / 2) + 1) / 2; }

/**
* Returns a filter curve function for a specified filter type.
* The band pass filter function can also be used for fading a signal.
*
* @param filterType
*    filter type (low-pass, high-pass, etc.).
* @param filterFreq1
*    Filter frequency for low-pass or high-pass. Lower filter frequecy for band-pass or band-stop.
* @param filterFreq2
*    Upper filter frequecy for band-pass or band-stop. Ignored for low-pass or high-pass.
* @param smoothingWidth
*    Distance between the start of the smoothing and the -6dB point.
*    The whole smoothing region width is 2 * smoothingWidth.
* @returns
*    A filter curve function, which returns values between 0 (=silence) and 1 (=pass unfiltered).
*/
export function getFilterCurveFunction (filterType: FilterType, filterFreq1: number, filterFreq2: number, smoothingWidth: number) : FilterCurveFunction {
   switch (filterType) {
      case FilterType.lowPass: {
         return (freq: number) => {
            if (freq < filterFreq1 - smoothingWidth) {
               return 1; }
             else if (freq < filterFreq1 + smoothingWidth) {
               return smoothingFunction((filterFreq1 - freq) / smoothingWidth); }
             else {
               return 0; }}; }
      case FilterType.highPass: {
         return (freq: number) => {
            if (freq < filterFreq1 - smoothingWidth) {
               return 0; }
             else if (freq < filterFreq1 + smoothingWidth) {
               return smoothingFunction((freq - filterFreq1) / smoothingWidth); }
             else {
               return 1; }}; }
      case FilterType.bandPass: {
         return (freq: number) => {
            if (freq < filterFreq1 - smoothingWidth) {
               return 0; }
             else if (freq < filterFreq1 + smoothingWidth) {
               return smoothingFunction((freq - filterFreq1) / smoothingWidth); }
             else if (freq < filterFreq2 - smoothingWidth) {
               return 1; }
             else if (freq < filterFreq2 + smoothingWidth) {
               return smoothingFunction((filterFreq2 - freq) / smoothingWidth); }
             else {
               return 0; }}; }
      case FilterType.bandStop: {
         return (freq: number) => {
            if (freq < filterFreq1 - smoothingWidth) {
               return 1; }
             else if (freq < filterFreq1 + smoothingWidth) {
               return smoothingFunction((filterFreq1 - freq) / smoothingWidth); }
             else if (freq < filterFreq2 - smoothingWidth) {
               return 0; }
             else if (freq < filterFreq2 + smoothingWidth) {
               return smoothingFunction((freq - filterFreq2) / smoothingWidth); }
             else {
               return 1; }}; }
      default: {
         throw new Error("Unsupported filter type."); }}}

/**
* Applies a filter curve function to an array of spectral amplitudes.
* It can also be used for fading a signal.
*/
export function applyFilterCurveFunction (inAmplitudes: ArrayLike<number>, scalingFactor: number, filterCurveFunction: FilterCurveFunction) : Float64Array {
   const n = inAmplitudes.length;
   const outAmplitudes = new Float64Array(n);
   for (let p = 0; p < n; p++) {
      const frequency = p / scalingFactor;
      const filterFactor = filterCurveFunction(frequency);
      outAmplitudes[p] = filterFactor * inAmplitudes[p]; }
   return outAmplitudes; }

/**
* Filters a signal using FFT and iFFT.
*
* All frequency parameters are normalized frequencies according to the following formula:
*   `nomalizedFrequency = frequencyInHz / sampleRate = 1 / waveLengthInSamples`
*
* The input signal should ideally be windoweded to prevent artifacts. But this would distort the amplitude curve of the output signal.
* In practice, the input signal should at least have a fade-in/fade-out.
*
* @param inSamples
*    The input signal samples.
*    If the length of the input array is even, the computation is faster. If it's a power of 2, it's even faster.
* @param filterType
*    The filter type (low-pass, high-pass, etc.).
* @param filterFreq1
*    Normalized filter frequency for low-pass or high-pass. Lower filter frequecy for band-pass or band-stop.
* @param filterFreq2
*    Normalized upper filter frequecy for band-pass or band-stop. Ignored for low-pass or high-pass.
* @param smoothingWidth
*    Normalized frequency distance between the start of the smoothing and the -6dB point.
* @returns
*    The filtered output signal samples.
*/
export function filterSignal (inSamples: ArrayLike<number>, filterType: FilterType, filterFreq1: number, filterFreq2: number, smoothingWidth: number) : Float64Array {
   const n = inSamples.length;
   const inSpectrum = Fft.fftRealSpectrum(inSamples);
   const inAmplitudes = inSpectrum.getAbsArray();
   const inPhases = inSpectrum.getArgArray();
   const filterCurveFunction = getFilterCurveFunction(filterType, filterFreq1, filterFreq2, smoothingWidth);
   const outAmplitudes = applyFilterCurveFunction(inAmplitudes, n, filterCurveFunction);
   const outPhases = inPhases;
   const outSpectrum = ComplexArray.fromPolar(outAmplitudes, outPhases);
   const outSignal = Fft.iFftRealHalf(outSpectrum, n);
   return outSignal; }
