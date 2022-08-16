import * as ArrayUtils from "../utils/ArrayUtils.js";
import {MutableArrayLike} from "../utils/MiscUtils.js";

function handleTrivialCases (ia: ArrayLike<number>, oa: MutableArrayLike<number>) : boolean {
   const iLen = ia.length;
   const oLen = oa.length;
   if (iLen == oLen) {
      ArrayUtils.copy(ia, oa);
      return true; }
   if (oLen == 0) {
      return true; }
   if (iLen == 0) {
      ArrayUtils.fill(oa, NaN);
      return true; }
   if (iLen == 1) {
      ArrayUtils.fill(oa, ia[0]);
      return true; }
   if (oLen == 1) {
      oa[0] = ArrayUtils.sum(ia) / iLen;                             // (not entirely correct for linear interpolation and iLen > 2)
      return true; }
   return false; }

/**
* Resamples a signal using linear interpolation.
*
* This is normally used for fast upsampling.
*
* @param ia
*    Input array.
* @param oa
*    output array.
*/
export function resampleLinear (ia: ArrayLike<number>, oa: MutableArrayLike<number>) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = iLen - 1;
   const od = oLen - 1;
   let ip = 0;
   let op = 0;
   let d = 0;                                                        // position delta using integer arithmetics
   while (op < oLen) {
      if (d >= od) {
         if (od >= id) {                                             // speed optimization for upsampling
            ip++;
            d -= od; }
          else {
            const i = Math.trunc(d / od);
            ip += i;
            d -= i * od; }}
      let x: number;
      if (d == 0) {
         x = ia[ip]; }
       else {
         x = ia[ip] * ((od - d) / od) + ia[ip + 1] * (d / od) ; }
      oa[op++] = x;
      d += id; }}

/**
* Resamples a signal using averaging interpolation.
*
* This is normally used for fast downsampling.
*
* @param ia
*    Input array.
* @param oa
*    output array.
*/
export function resampleAverage (ia: ArrayLike<number>, oa: MutableArrayLike<number>) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   let ip = 0;
   let op = 0;
   let d = 0;                                                        // position delta (outPos - inPos) using integer arithmetics
   while (op < oLen) {
      d += iLen;
      let acc = 0;
      while (d >= oLen) {
         const w = Math.min(oLen, iLen + oLen - d);
         acc += ia[ip++] * w;
         d -= oLen; }
      if (d > 0) {
         acc += ia[ip] * Math.min(d, iLen); }
      oa[op++] = acc / iLen; }}

/**
* Resamples a signal using linear interpolation.
*
* This a slow reference implementation. It is simpler to understand than the
* optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    output array.
*/
export function resampleLinearSlow (ia: ArrayLike<number>, oa: MutableArrayLike<number>) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   for (let i = 0; i < oa.length; i++) {
      const p = i / (oa.length - 1) * (ia.length - 1);
      oa[i] = interpolateLinear(ia, p); }}

function interpolateLinear (samples: ArrayLike<number>, pos: number) : number {
   const p1 = Math.floor(pos);
   const p2 = Math.ceil(pos);
   if (p1 < 0 || p2 >= samples.length) {
      return NaN; }
   if (p1 == p2) {
      return samples[p1]; }
   const v1 = samples[p1];
   const v2 = samples[p2];
   return v1 + (pos - p1) * (v2 - v1); }

/**
* Resamples a signal using averaging interpolation.
*
* This a slow reference implementation. It is simpler to understand than the
* optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    output array.
*/
export function resampleAverageSlow (ia: ArrayLike<number>, oa: MutableArrayLike<number>) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const w = 1 / oa.length * ia.length;
   for (let i = 0; i < oa.length; i++) {
      const p = i / oa.length * ia.length - 0.5;
      oa[i] = computeAverageOfRange(ia, p, p + w); }}

// Returns the average of the sample values within the range from pos1 to pos2.
function computeAverageOfRange (samples: ArrayLike<number>, pos1: number, pos2: number) : number {
   const p1 = Math.max(-0.5, pos1);
   const p2 = Math.min(samples.length - 0.5, pos2);
   if (p1 >= p2) {
      return NaN; }
   const p1i = Math.round(p1);
   const p2i = Math.min(Math.round(p2), samples.length - 1);
   if (p1i >= p2i) {
      return samples[p1i]; }
   let sum = 0;
   sum += samples[p1i] * (p1i + 0.5 - p1);
   for (let i = p1i + 1; i < p2i; i++) {
      sum += samples[i]; }
   sum += samples[p2i] * (p2 - (p2i - 0.5));
   return sum / (p2 - p1); }
