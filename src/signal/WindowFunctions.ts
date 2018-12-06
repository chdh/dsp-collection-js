/**
* Window functions for signal processing.
*
* See https://en.wikipedia.org/wiki/Window_function
*
* In this module, the normal parameter range for the window functions is 0 to 1.
*/

export type WindowFunction = (x: number) => number;

export interface WindowFunctionDescr {                     // window function descriptor
   name:           string;                                 // descriptive name
   id:             string;                                 // internal ID
   f:              WindowFunction;                         // function object
   gain:           number; }                               // coherent gain (arithmetic mean) of the window function

export const windowFunctionIndex: WindowFunctionDescr[] = [
   { name: "Blackman",         id: "blackman",         f: blackmanWindow,        gain: 0.42       },
   { name: "Blackman-Harris",  id: "blackmanHarris",   f: blackmanHarrisWindow,  gain: 0.35875    },
   { name: "Blackman-Nuttall", id: "blackmanNuttall",  f: blackmanNuttallWindow, gain: 0.3635819  },
   { name: "Flat top",         id: "flatTop",          f: flatTopWindow,         gain: 0.21557895 },
   { name: "Hamming",          id: "hamming",          f: hammingWindow,         gain: 0.53836    },
   { name: "Hann",             id: "hann",             f: hannWindow,            gain: 0.5        },
   { name: "Nuttall",          id: "nuttall",          f: nuttallWindow,         gain: 0.355768   },
   { name: "Rectangular",      id: "rect",             f: rectangularWindow,     gain: 1          },
   { name: "Triangular",       id: "triangular",       f: triangularWindow,      gain: 0.5        },
   ];

export function getFunctionbyId (id: string, normalize = true) : WindowFunction {
   for (const descr of windowFunctionIndex) {
      if (descr.id == id) {
         if (normalize && descr.gain != 1) {
            const gain = descr.gain;
            return (x: number) => descr.f(x) / gain; }
          else {
            return descr.f; }}}
   throw new Error("Undefined window function id \"" + id + "\"."); }

// Applies a window function to an array as a "pediodic" window (for DFT).
export function applyWindow (a: Float64Array, windowFunction: WindowFunction) : Float64Array {
   const a2 = new Float64Array(a.length);
   for (let i = 0; i < a.length; i++) {
      a2[i] = a[i] * windowFunction(i / a.length); }
   return a2; }

// Creates an array with the window function values for a "pediodic" window (for DFT).
export function createArray (windowFunction: WindowFunction, n: number) : Float64Array {
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = windowFunction(i / n); }
   return a; }

// Calculates the coherent gain of a window function ("pediodic" window, used for DFT).
// The returned value is the arithmetic mean of the function values, which is the same as
// the amplitude of the middle component (DC value) in the spectrum of the window function.
// The value should be about the same as `WindowFunctionDescr.gain`.
export function calculateCoherentGain (windowFunction: WindowFunction, n: number) : Number {
   let sum = 0;
   for (let i = 0; i < n; i++) {
      sum += windowFunction(i / n); }
   return sum / n; }

//------------------------------------------------------------------------------

export function rectangularWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   return 1; }

export function triangularWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   if (x <= 0.5) {
      return x * 2; }
    else {
      return (1 - x) * 2; }}

export function hammingWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const w = 2 * Math.PI * x;
   return 0.53836 - 0.46164 * Math.cos(w); }

export function hannWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const w = 2 * Math.PI * x;
   return 0.5 - 0.5 * Math.cos(w); }

export function blackmanWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const a  = 0.16;
   const a0 = (1 - a) / 2;
   const a1 = 0.5;
   const a2 = a / 2;
   const w  = 2 * Math.PI * x;
   return a0 - a1 * Math.cos(w) + a2 * Math.cos(2 * w); }

export function blackmanHarrisWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const a0 = 0.35875;
   const a1 = 0.48829;
   const a2 = 0.14128;
   const a3 = 0.01168;
   const w  = 2 * Math.PI * x;
   return a0 - a1 * Math.cos(w) + a2 * Math.cos(2 * w) - a3 * Math.cos(3 * w); }

export function blackmanNuttallWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const a0 = 0.3635819;
   const a1 = 0.4891775;
   const a2 = 0.1365995;
   const a3 = 0.0106411;
   const w  = 2 * Math.PI * x;
   return a0 - a1 * Math.cos(w) + a2 * Math.cos(2 * w) - a3 * Math.cos(3 * w); }

export function nuttallWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const a0 = 0.355768;
   const a1 = 0.487396;
   const a2 = 0.144232;
   const a3 = 0.012604;
   const w  = 2 * Math.PI * x;
   return a0 - a1 * Math.cos(w) + a2 * Math.cos(2 * w) - a3 * Math.cos(3 * w); }

export function flatTopWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const a0 = 0.21557895;
   const a1 = 0.41663158;
   const a2 = 0.277263158;
   const a3 = 0.083578947;
   const a4 = 0.006947368;
   const w  = 2 * Math.PI * x;
   return a0 - a1 * Math.cos(w) + a2 * Math.cos(2 * w) - a3 * Math.cos(3 * w) + a4 * Math.cos(4 * w); }
