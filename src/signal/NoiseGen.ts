/**
* Noise generation functions.
*/

import ComplexArray from "../math/ComplexArray.ts";
import {UniFunction} from "../math/MathUtils.ts";
import * as Fft from "./Fft.ts";
import * as DspUtils from "../utils/DspUtils.ts";

/**
* High-level function to synthesize random noise with a specified amplitude spectrum.
*
* @param spectrumCurveFunction
*    A function that maps a frequency [Hz] to a spectrum amplitude (linear scale).
* @param amplitudeCurveFunction
*    An optional envelope function that maps a time [s] to a gain factor (linear scale)
* @param duration
*    The duration [s] of the output signal.
* @param sampleRate
*    The sample rate [Hz] of the output signal.
* @param noiseRms
*    A target RMS level for the generated noise signal.
*    The peak amplitude of the noise is roughly 3 times this level.
*    The signal is scaled to this RMS before `amplitudeCurveFunction` is applied.
*    This value is ignored if 0 or `undefined`.
* @returns
*    The generated noise signal.
*/
export function synthesizeSpectralNoise (spectrumCurveFunction: UniFunction, amplitudeCurveFunction: UniFunction | undefined, duration: number, sampleRate: number, noiseRms: number | undefined) : Float64Array {
   const n0 = Math.round(duration * sampleRate);
   const n = (n0 % 2 == 0 || n0 < 4096) ? n0 : n0 + 1;                         // round up to even length to enable the optimized FFT path (skipped for small n)
   const n2 = Math.floor(n / 2);
   const specAmplitudes = Float64Array.from({length: n2}, (_x, i) => spectrumCurveFunction(i * sampleRate / n));
   specAmplitudes[0] = 0;                                                      // ensure that the DC value is 0
   const noiseSignal = generateSpectralNoise(specAmplitudes, n);
   if ((noiseRms ?? 0) > 0) {
      DspUtils.adjustSignalLevel(noiseSignal, {targetRms: noiseRms}); }
   let signal1 = noiseSignal;
   if (amplitudeCurveFunction) {
      const timeAmplitudes = Float64Array.from({length: n}, (_x, i) => amplitudeCurveFunction(i / sampleRate));
      signal1 = signal1.map((x, i) => x * timeAmplitudes[i]); }
   const signal2 = (n == n0) ? signal1 : signal1.subarray(0, n0);
   return signal2; }

/**
* Low-level function to generate random noise with a specified amplitude spectrum.
*
* The passed spectral amplitudes are combined with random phases and
* then transformed by an inverse FFT to produce a time-domain signal.
*
* @param specAmplitudes
*    An array of spectrum amplitudes (linear scale).
*    The DC value at `specAmplitudes[0]` is normally set to 0.
*    `specAmplitudes[i]` is the amplitude of FFT bin `i`, i.e. a sinusoid with period `n / i` samples.
* @param n
*    The number of output samples to generate.
*    Even values of n are faster than odd values; powers of 2 are fastest.
* @returns
*    The generated noise signal.
*/
export function generateSpectralNoise (specAmplitudes: ArrayLike<number>, n: number) : Float64Array {
   const n2 = specAmplitudes.length;
   const specPhases = Float64Array.from({length: n2}, () => Math.random() * 2 * Math.PI);
   const spectrum = ComplexArray.fromPolar(specAmplitudes, specPhases);
   const signal = Fft.iFftRealHalf(spectrum, n);
   return signal; }
