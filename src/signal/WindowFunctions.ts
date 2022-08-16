/**
* Window functions for signal processing.
*
* See https://en.wikipedia.org/wiki/Window_function
*
* In this module, the normal parameter range for the window functions is 0 to 1.
*/

import * as MiscUtils from "../utils/MiscUtils.js";

export type WindowFunction = (x: number) => number;

export interface WindowFunctionDescr {                     // window function descriptor
   name:           string;                                 // descriptive name
   id:             string;                                 // internal ID
   f:              WindowFunction;                         // non-normalized window function
   fNorm:          WindowFunction;                         // gain-normalized window function
   cpuCost:        number; }                               // relative complexity of computation

export const windowFunctionIndex: WindowFunctionDescr[] = [
   { name: "Blackman",             id: "blackman",        f: blackmanWindow,        fNorm: blackmanWindowNorm,        cpuCost: 2 },
   { name: "Blackman-Harris",      id: "blackmanHarris",  f: blackmanHarrisWindow,  fNorm: blackmanHarrisWindowNorm,  cpuCost: 3 },
   { name: "Blackman-Nuttall",     id: "blackmanNuttall", f: blackmanNuttallWindow, fNorm: blackmanNuttallWindowNorm, cpuCost: 3 },
   { name: "Flat top",             id: "flatTop",         f: flatTopWindow,         fNorm: flatTopWindowNorm,         cpuCost: 4 },
   { name: "Hamming",              id: "hamming",         f: hammingWindow,         fNorm: hammingWindowNorm,         cpuCost: 1 },
   { name: "Hann",                 id: "hann",            f: hannWindow,            fNorm: hannWindowNorm,            cpuCost: 1 },
   { name: "Nuttall",              id: "nuttall",         f: nuttallWindow,         fNorm: nuttallWindowNorm,         cpuCost: 3 },
   { name: "Parabolic",            id: "parabolic",       f: parabolicWindow,       fNorm: parabolicWindowNorm,       cpuCost: 0 },
   { name: "Rectangular",          id: "rect",            f: rectangularWindow,     fNorm: rectangularWindow,         cpuCost: 0 },
   { name: "Triangular",           id: "triangular",      f: triangularWindow,      fNorm: triangularWindowNorm,      cpuCost: 0 },
// { name: "chdh1 (experimental)", id: "chdh1",           f: chdh1Window,           fNorm: chdh1WindowNorm,           cpuCost: 1 },
   ];

export function getFunctionDescrById (id: string) : WindowFunctionDescr {
   for (const descr of windowFunctionIndex) {
      if (descr.id == id) {
         return descr; }}
   throw new Error("Undefined window function id \"" + id + "\"."); }

export function getFunctionbyId (id: string, {normalize = true, valueCacheCostLimit = 0, tableCacheCostLimit = 0} = {}) : WindowFunction {
   const descr = getFunctionDescrById(id);
   let f = normalize ? descr.fNorm : descr.f;
   const origF = f;
   if (valueCacheCostLimit && descr.cpuCost >= valueCacheCostLimit) {
      f = MiscUtils.createMapBackedFunction(f); }
   if (tableCacheCostLimit && descr.cpuCost >= tableCacheCostLimit) {
      if (f == origF) {
         // Create a dummy function object to attach the cache map.
         const tempF = f;
         f = (x: number) => tempF(x); }
      (<any>f).windowTableCache = new Map(); }
   return f; }

// Returns an array with the window function values for a "pediodic" window (for DFT).
// If table caching is enabled for the window function, the generated tables are kept in
// memory and re-used.
export function getWindowTable (windowFunction: WindowFunction, n: number) : Float64Array {
   const windowTableCache: Map<number,Float64Array> = (<any>windowFunction).windowTableCache;
   if (windowTableCache) {
      const oldTable = windowTableCache.get(n);
      if (oldTable) {
         return oldTable; }}
   const newTable = createWindowTable(windowFunction, n);
   if (windowTableCache) {
      windowTableCache.set(n, newTable); }
   return newTable; }

function createWindowTable (windowFunction: WindowFunction, n: number) : Float64Array {
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = windowFunction(i / n); }
   return a; }

// Applies a window function to an array as a "pediodic" window (for DFT).
export function applyWindow (a: ArrayLike<number>, windowFunction: WindowFunction) : Float64Array {
   const a2 = new Float64Array(a.length);
   if ((<any>windowFunction).windowTableCache) {
      const table = getWindowTable(windowFunction, a.length);
      for (let i = 0; i < a.length; i++) {
         a2[i] = a[i] * table[i]; }}
    else {
      for (let i = 0; i < a.length; i++) {
         a2[i] = a[i] * windowFunction(i / a.length); }}
   return a2; }

export function applyWindowById (a: ArrayLike<number>, windowFunctionId: string) : Float64Array {
   const windowFunction = getFunctionbyId(windowFunctionId);
   return applyWindow(a, windowFunction); }

// Calculates the coherent gain of a window function ("pediodic" window, used for DFT).
// The returned value is the arithmetic mean of the function values, which is the same as
// the amplitude of the middle component (DC value) in the spectrum of the window function.
// The value should be about the same as `WindowFunctionDescr.gain`.
export function calculateCoherentGain (windowFunction: WindowFunction, n: number) : number {
   let sum = 0;
   for (let i = 0; i < n; i++) {
      sum += windowFunction(i / n); }
   return sum / n; }

//--- Gain-normalized versions -------------------------------------------------

// The function value is divided by the coherent gain (arithmetic mean) of the window function.
export function blackmanWindowNorm        (x: number) { return blackmanWindow(x)        / 0.42       ; }
export function blackmanHarrisWindowNorm  (x: number) { return blackmanHarrisWindow(x)  / 0.35875    ; }
export function blackmanNuttallWindowNorm (x: number) { return blackmanNuttallWindow(x) / 0.3635819  ; }
export function flatTopWindowNorm         (x: number) { return flatTopWindow(x)         / 0.21557895 ; }
export function hammingWindowNorm         (x: number) { return hammingWindow(x)         / 0.53836    ; }
export function hannWindowNorm            (x: number) { return hannWindow(x)            / 0.5        ; }
export function nuttallWindowNorm         (x: number) { return nuttallWindow(x)         / 0.355768   ; }
export function parabolicWindowNorm       (x: number) { return parabolicWindow(x)       / (2/3)      ; }
export function triangularWindowNorm      (x: number) { return triangularWindow(x)      / 0.5        ; }
export function chdh1WindowNorm           (x: number) { return chdh1Window(x)           / 0.497595   ; }

//--- Non-normalized versions --------------------------------------------------

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

export function parabolicWindow (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   return 1 - (2 * x - 1) ** 2; }

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

// Experimental window. Similar to Hann.
export function chdh1Window (x: number) : number {
   if (x < 0 || x >= 1) {
      return 0; }
   const p = 1 - Math.abs(1 - 2 * x);
   return p ** (2 * (1 - p)); }
