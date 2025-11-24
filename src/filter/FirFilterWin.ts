// FIR filter with window functions.

import MutableComplex from "../math/MutableComplex.ts";
import * as WindowFunctions from "../signal/WindowFunctions.ts";
import {WindowFunction} from "../signal/WindowFunctions.ts";
import {goertzelSingle} from "../signal/Goertzel.ts";
import * as ArrayUtils from "../utils/ArrayUtils.ts";

// Creates the FIR filter kernel (moving average kernel) for a given window function.
// `symetric` = true and an odd value for `width` can be used to avoid displacement of the FIR filter output.
export function createWindowKernel (f: WindowFunction, width: number, symetric: boolean = true) : Float64Array {
   const nudge = symetric ? 1 : 0;
   const a1 = Float64Array.from({length: width}, (_x, i) => f(i / (width - nudge)));
   const sum = ArrayUtils.sum(a1);
   const a2 = a1.map(x => x / sum);
   return a2; }

// Parameters for creating an FIR filter kernel.
// The current implementation only supports LP filters yet.
export interface FilterSpec {
   windowFunctionId:         string;
   width?:                   number;
      // Filter width in samples.
      // Either `width` or `normFirstMinFreq` must be specified.
   normFirstMinFreq?:        number; }
      // `normFirstMinFreq` is the normalized frequency of the first minimum of the filter transfer curve.
      // Formula: normFirstMinFreq = firstMinFrequency / sampleRate = 1 / waveLengthOfFirstMinimumInSamples

// Creates an IIR kernel for a low pass filter.
// The current implementation only supports LP filters yet.
export function createFilterKernel (filterSpec: FilterSpec) : Float64Array {
   const descr = WindowFunctions.getFunctionDescrById(filterSpec.windowFunctionId);
   const width = filterSpec.width ?? Math.round(descr.firstMinPos / filterSpec.normFirstMinFreq!);
   if (!Number.isFinite(width) || width < 3) {
      throw new Error("Filter parameters out of range."); }
   return createWindowKernel(descr.f, width); }

// Computes the frequency response of an FIR kernel at a specified frequency.
// normFreq = frequency / sampleRate
export function calcFreqRespAt (kernel: ArrayLike<number>, normFreq: number): MutableComplex {
   const relFreq = normFreq * kernel.length;
   return goertzelSingle(kernel, relFreq); }

function reflectIndex (i: number, n: number) : number {
   if (i >= 0 && i < n) {
      return i; }
   if (n <= 1) {
      return 0; }
   const period = 2 * (n - 1);
   const t = (i % period + period) % period;
   return (t < n) ? t : period - t; }

// Applies an FIR filter kernel at position `pos` and returns the output value for that position.
export function applyFirKernelAt (signal: ArrayLike<number>, pos: number, kernel: ArrayLike<number>) : number {
   if (pos < 0 || pos >= signal.length) {
      return NaN; }
   const width = kernel.length;
   const m = Math.floor(kernel.length / 2);
   const p0 = pos - m;
   let acc = 0;
   for (let i = 0; i < width; i++) {
      const p = reflectIndex(p0 + i, signal.length);
      acc += signal[p] * kernel[i]; }
   return acc; }

// Applies an FIR filter kernel to an array.
// Returns the convolution of a signal and a filter kernel.
export function applyFirKernel (signal: ArrayLike<number>, kernel: Float64Array) : Float64Array {
   const out = new Float64Array(signal.length);
   for (let i = 0; i < signal.length; i++) {
      out[i] = applyFirKernelAt(signal, i, kernel); }
   return out; }

// Filters a signal in an array.
export function filterArray (signal: ArrayLike<number>, filterSpec: FilterSpec) : Float64Array {
   const kernel = createFilterKernel(filterSpec);
   return applyFirKernel(signal, kernel); }
