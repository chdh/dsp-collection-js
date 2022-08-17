import * as ArrayUtils from "../utils/ArrayUtils.js";
import {MutableArrayLike} from "../utils/MiscUtils.js";

function handleTrivialCases (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, neNe = false) : boolean {
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
      if (preserveScale) {
         oa[0] = ia[0]; }
       else if (neNe) {
         oa[0] = ia[Math.trunc(iLen / 2)]; }
       else {
         oa[0] = ArrayUtils.sum(ia) / iLen; }                        // (not entirely correct for linear interpolation and iLen > 2)
      return true; }
   return false; }

//--- Nearest-neighbor ---------------------------------------------------------

/**
* Optimized one-dimensional resampling using nearest-neighbor interpolation.
*
* @param ia
*    Input array.
* @param oa
*    output array.
* @param preserveScale
*    false: inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5.
*           The array is processed symetrically (except for the entries which are
*           exactly in the middle between two neighbors).
*    true:  inputPosition = outputPosition / oa.length * ia.length.
* @param extraValues
*    Value for the extra array entries at the end, when upsampling with preserveScale = true.
*/
export function resampleNearestNeighbor (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa, preserveScale, true)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = iLen * 2;
   const od = oLen * 2;
   const oLen1 = preserveScale ? Math.trunc((iLen - 0.5) / iLen * oLen + 1 - 1E-9) : oLen;
   let ip = 0;                                                       // input array position
   let op = 0;                                                       // output array position
   let d = preserveScale ? od / 2 : id / 2;                          // position delta using integer arithmetics
   while (op < oLen1) {
      if (d >= od) {
         if (od >= id) {                                             // speed optimization for upsampling
            ip++;
            d -= od; }
          else {
            const i = Math.trunc(d / od);
            ip += i;
            d -= i * od; }}
      oa[op++] = ia[ip];
      d += id; }
   while (op < oLen) {
      oa[op++] = extraValues; }}

/**
* Reference implementation of one-dimensional resampling using nearest-neighbor interpolation.
*
* This a slow reference implementation. It is simpler to understand than the
* optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    output array.
* @param preserveScale
*    false: inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5
*           The array is processed symetrically (except for the entries which are
*           exactly in the middle between two neighbors).
*    true:  inputPosition = outputPosition / oa.length * ia.length.
* @param extraValues
*    Value for the extra array entries at the end, when upsampling with preserveScale = true.
*/
export function resampleNearestNeighborRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa, preserveScale, true)) {
      return; }
   for (let op = 0; op < oa.length; op++) {
      let ip: number;
      if (preserveScale) {
         ip = op / oa.length * ia.length; }
       else {
         ip = (op + 0.5) / oa.length * ia.length - 0.5; }
      if (ip <= ia.length - 0.5 - 1E-9) {
         oa[op] = interpolateNearestNeighbor(ia, ip); }
       else {
         oa[op] = extraValues; }}}

function interpolateNearestNeighbor (a: ArrayLike<number>, pos: number) : number {
   if (a.length == 0) {
      return NaN; }
   const p0 = Math.round(pos + 1E-9);
   const p = Math.max(0, Math.min(a.length - 1,  p0));
   return a[p]; }

//--- Linear interpolation -----------------------------------------------------

/**
* Optimized one-dimensional resampling using linear interpolation.
*
* This is normally used for fast upsampling.
*
* @param ia
*    Input array.
* @param oa
*    output array.
* @param preserveScale
*    false: inputPosition = outputPosition / (oa.length - 1) * (ia.length - 1).
*           The first input element matches the first output element and
*           the last input element matches the last output element.
*           The array is processed symetrically.
*    true: inputPosition = outputPosition / oa.length * ia.length.
*           The first input element matches the first output element, but
*           the last input element does not match the last output element.
* @param extraValues
*    Value for the extra array entries at the end, when upsampling with preserveScale = true.
*/
export function resampleLinear (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa, preserveScale)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = preserveScale ? iLen : iLen - 1;
   const od = preserveScale ? oLen : oLen - 1;
   const oLen1 = preserveScale ? Math.trunc((iLen - 1) * oLen / iLen + 1 + 1E-9) : oLen;
   let ip = 0;
   let op = 0;
   let d = 0;                                                        // position delta using integer arithmetics
   while (op < oLen1) {
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
      d += id; }
   while (op < oLen) {
      oa[op++] = extraValues; }}

/**
* Reference implementation of one-dimensional resampling using linear interpolation.
*
* This a slow reference implementation. It is simpler to understand than the
* optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    output array.
* @param preserveScale
*    false: inputPosition = outputPosition / (oa.length - 1) * (ia.length - 1).
*           The first input element matches the first output element and
*           the last input element matches the last output element.
*           The array is processed symetrically.
*    true: inputPosition = outputPosition / oa.length * ia.length.
*           The first input element matches the first output element, but
*           the last input element does not match the last output element.
* @param extraValues
*    Value for the extra array entries at the end, when upsampling with preserveScale = true.
*/
export function resampleLinearRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa, preserveScale)) {
      return; }
   for (let op = 0; op < oa.length; op++) {
      let ip: number;
      if (preserveScale) {
         ip = op / oa.length * ia.length; }
       else {
         ip = op / (oa.length - 1) * (ia.length - 1); }
      if (Math.abs(ip - Math.round(ip)) < 1E-10) {
         ip = Math.round(ip); }
      if (ip <= ia.length - 1) {
         oa[op] = interpolateLinear(ia, ip); }
       else {
         oa[op] = extraValues; }}}

function interpolateLinear (a: ArrayLike<number>, pos: number) : number {
   const p1 = Math.floor(pos);
   const p2 = Math.ceil(pos);
   if (p1 < 0 || p2 >= a.length) {
      return NaN; }
   if (p1 == p2) {
      return a[p1]; }
   const v1 = a[p1];
   const v2 = a[p2];
   return v1 + (pos - p1) * (v2 - v1); }

//--- Averaging ----------------------------------------------------------------

/**
* Optimized one-dimensional resampling using averaging interpolation.
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
* Reference implementation of one-dimensional resampling using averaging interpolation.
*
* This a slow reference implementation. It is simpler to understand than the
* optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    output array.
*/
export function resampleAverageRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const w = 1 / oa.length * ia.length;
   for (let i = 0; i < oa.length; i++) {
      const p = i / oa.length * ia.length - 0.5;
      oa[i] = computeAverageOfRange(ia, p, p + w); }}

// Returns the average of the sample values within the range from pos1 to pos2.
function computeAverageOfRange (a: ArrayLike<number>, pos1: number, pos2: number) : number {
   const p1 = Math.max(-0.5, pos1);
   const p2 = Math.min(a.length - 0.5, pos2);
   if (p1 >= p2) {
      return NaN; }
   const p1i = Math.round(p1);
   const p2i = Math.min(Math.round(p2), a.length - 1);
   if (p1i >= p2i) {
      return a[p1i]; }
   let sum = 0;
   sum += a[p1i] * (p1i + 0.5 - p1);
   for (let i = p1i + 1; i < p2i; i++) {
      sum += a[i]; }
   sum += a[p2i] * (p2 - (p2i - 0.5));
   return sum / (p2 - p1); }
