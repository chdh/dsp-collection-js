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
   f:              WindowFunction; }                       // function object

export const windowFunctionIndex : WindowFunctionDescr[] = [
   { name: "Blackman",         id: "blackman",         f: blackmanWindow        },
   { name: "Blackman-Harris",  id: "blackmanHarris",   f: blackmanHarrisWindow  },
   { name: "Blackman-Nuttall", id: "blackmanNuttall",  f: blackmanNuttallWindow },
   { name: "Hamming",          id: "hamming",          f: hammingWindow         },
   { name: "Hann",             id: "hann",             f: hannWindow            },
   { name: "Nuttall",          id: "nuttall",          f: nuttallWindow         },
   { name: "Rectangular",      id: "rect",             f: rectangularWindow     },
   { name: "Triangular",       id: "triangular",       f: triangularWindow      },
   ];

export function getFunctionbyId (id: string) : WindowFunction {
   for (const descr of windowFunctionIndex) {
      if (descr.id == id) {
         return descr.f; }}
   throw new Error("Undefined window function id \"" + id + "\"."); }

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
