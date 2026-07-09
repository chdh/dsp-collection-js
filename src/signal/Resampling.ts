/**
* Resampling functions.
*
* This module contains a collection of one-dimensional resampling algorithms.
*
* - Nearest-neighbor interpolation.
* - Linear interpolation.
* - Averaging interpolation.
* - Sum-preserving resampling (rebinning).
*
* All resampling functions have a `preserveScale` parameter that selects how output array
* positions are mapped to input array positions:
*
* - With `preserveScale = false` (the default), the input array is mapped symmetrically
*   onto the output array, so that both arrays cover the same overall range.
* - With `preserveScale = true`, positions are scaled by the exact ratio of the array
*   lengths and position 0 of the input array is aligned with position 0 of the output
*   array. This preserves the coordinate scale associated with the array elements.
*   The upper array ends are not aligned; the individual functions document how output
*   entries that map beyond the end of the input array are handled.
*
* Trivial cases are handled uniformly by all resampling functions: If the input and
* output arrays have the same length, the values are copied unchanged. If the input
* array is empty and the output array is not, the output array is filled with NaN,
* or with 0 for sum-preserving resampling.
*
* The exact position mapping formulas are given in the documentation of the individual
* functions.
*
* For each resampling method there are optimized and reference implementations in this module.
* The optimized versions use an integer counting algorithm, similar to the Bresenham algorithm
* used for line drawing.
* This is faster than using floating point numbers and avoids rounding problems and artefacts
* that can occur with floating point arithmetic.
* The reference implementations are easier to understand and are used to verify the results of
* the optimized versions.
*
* @module
*/

import * as ArrayUtils from "../utils/ArrayUtils.ts";
import {MutableArrayLike} from "../utils/MiscUtils.ts";

const eps = 1E-9;                                                    // tolerance to compensate for floating point rounding errors

function handleTrivialCases (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveSum = false) : boolean {
   const iLen = ia.length;
   const oLen = oa.length;
   if (iLen == oLen) {
      ArrayUtils.copy(ia, oa);
      return true; }
   if (oLen == 0) {
      return true; }
   if (iLen == 0) {
      if (preserveSum) {
         ArrayUtils.fill(oa, 0); }
       else {
         ArrayUtils.fill(oa, NaN); }
      return true; }
   return false; }

//--- Nearest-neighbor ---------------------------------------------------------

/**
* Optimized one-dimensional resampling using nearest-neighbor interpolation.
*
* Each output value is the value of the input sample nearest to the input position
* that corresponds to the output array index (see `preserveScale`).
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the input
*    position (`inputPosition`) at which the input array is sampled:
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically (except for positions exactly midway
*    between two input samples, where the upper neighbor is chosen).
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
* @param extraValues
*    Fill value for the output entries at the end whose mapped input position lies
*    beyond the end of the input array. Such entries only occur when upsampling
*    with `preserveScale = true`.
*/
export function resampleNearestNeighbor (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = iLen * 2;
   const od = oLen * 2;
   const oLen1 = preserveScale ? Math.trunc((iLen - 0.5) / iLen * oLen + 1 - eps) : oLen;
   let ip = 0;                                                       // input array position
   let op = 0;                                                       // output array position
   let d = preserveScale ? od / 2 : id / 2;                          // position delta using integer arithmetic
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
* This is a slow reference implementation of {@link resampleNearestNeighbor}. It is
* simpler to understand than the optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the input
*    position (`inputPosition`) at which the input array is sampled:
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically (except for positions exactly midway
*    between two input samples, where the upper neighbor is chosen).
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
* @param extraValues
*    Fill value for the output entries at the end whose mapped input position lies
*    beyond the end of the input array. Such entries only occur when upsampling
*    with `preserveScale = true`.
*/
export function resampleNearestNeighborRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   for (let op = 0; op < oa.length; op++) {
      let ip: number;
      if (preserveScale) {
         ip = op / oa.length * ia.length; }
       else {
         ip = (op + 0.5) / oa.length * ia.length - 0.5; }
      if (ip <= ia.length - 0.5 - eps) {
         oa[op] = interpolateNearestNeighbor(ia, ip); }
       else {
         oa[op] = extraValues; }}}

function interpolateNearestNeighbor (a: ArrayLike<number>, pos: number) : number {
   if (a.length == 0) {
      return NaN; }
   const p0 = Math.round(pos + eps);
   const p = Math.max(0, Math.min(a.length - 1,  p0));
   return a[p]; }

//--- Linear interpolation -----------------------------------------------------

/**
* Optimized one-dimensional resampling using linear interpolation.
*
* This function is normally used for fast upsampling.
*
* Each output value is the input array value linearly interpolated at the input
* position that corresponds to the output array index (see `preserveScale`).
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the input
*    position (`inputPosition`) at which the input array is interpolated:
*  * false:<br>
*    `inputPosition = outputPosition / (oa.length - 1) * (ia.length - 1)`<br>
*    The first input element matches the first output element and
*    the last input element matches the last output element.
*    The array is processed symmetrically.
*    For `oa.length == 1` the mapping is undefined and the mean of the
*    input values is used as the output value.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`<br>
*    The first input element matches the first output element, but
*    the last input element does not match the last output element.
* @param extraValues
*    Fill value for the output entries at the end whose mapped input position lies
*    beyond the end of the input array. Such entries only occur when upsampling
*    with `preserveScale = true`.
*/
export function resampleLinear (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   if (oLen == 1 && !preserveScale) {                                // position mapping is undefined for a single output element
      oa[0] = ArrayUtils.sum(ia) / iLen;                             // the mean of the input values is used instead
      return; }
   const id = preserveScale ? iLen : iLen - 1;
   const od = preserveScale ? oLen : oLen - 1;
   const oLen1 = preserveScale ? Math.trunc((iLen - 1) * oLen / iLen + 1 + eps) : oLen;
   let ip = 0;
   let op = 0;
   let d = 0;                                                        // position delta using integer arithmetic
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
* This is a slow reference implementation of {@link resampleLinear}. It is
* simpler to understand than the optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the input
*    position (`inputPosition`) at which the input array is interpolated:
*  * false:<br>
*    `inputPosition = outputPosition / (oa.length - 1) * (ia.length - 1)`<br>
*    The first input element matches the first output element and
*    the last input element matches the last output element.
*    The array is processed symmetrically.
*    For `oa.length == 1` the mapping is undefined and the mean of the
*    input values is used as the output value.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`<br>
*    The first input element matches the first output element, but
*    the last input element does not match the last output element.
* @param extraValues
*    Fill value for the output entries at the end whose mapped input position lies
*    beyond the end of the input array. Such entries only occur when upsampling
*    with `preserveScale = true`.
*/
export function resampleLinearRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false, extraValues = 0) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   if (oa.length == 1 && !preserveScale) {                           // position mapping is undefined for a single output element
      oa[0] = ArrayUtils.sum(ia) / ia.length;                        // the mean of the input values is used instead
      return; }
   for (let op = 0; op < oa.length; op++) {
      let ip: number;
      if (preserveScale) {
         ip = op / oa.length * ia.length; }
       else {
         ip = op / (oa.length - 1) * (ia.length - 1); }
      if (Math.abs(ip - Math.round(ip)) < eps) {
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
* This function is normally used for fast downsampling.
*
* Each output value is the average of the input values within a range of the input
* array. The range has a width of `ia.length / oa.length` input samples and is
* centered at the input position that corresponds to the output array index
* (see `preserveScale`). Input samples that are only partially covered by the
* range contribute proportionally to their covered fraction.
*
* When `preserveScale` is `true`, values at the edge of the output array
* are set to `NaN` when the corresponding input array range extends outside
* of the input array.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the center
*    of the input range (`inputPosition`):
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
*/
export function resampleAverage (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = iLen * 2;
   const od = oLen * 2;
   let ip = 0;
   let op = 0;
   let d = preserveScale ? oLen - iLen : 0;                          // position delta (outPos - inPos) using integer arithmetic
   while (op < oLen) {
      let acc = (d < 0) ? NaN : 0;
      d += id;
      while (d >= od) {
         const w = Math.min(od, id + od - d);
         acc += ia[ip++] * w;
         d -= od; }
      if (d > 0) {
         if (ip < iLen) {
            acc += ia[ip] * Math.min(d, id); }
          else {
            acc = NaN; }}
      oa[op++] = acc / id; }}

/**
* Reference implementation of one-dimensional resampling using averaging interpolation.
*
* This is a slow reference implementation of {@link resampleAverage}. It is
* simpler to understand than the optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the center
*    of the input range (`inputPosition`):
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
*/
export function resampleAverageRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false) {
   if (handleTrivialCases(ia, oa)) {
      return; }
   const w = 1 / oa.length * ia.length;                              // w = width of one output cell range in the input coordinate space
   for (let op = 0; op < oa.length; op++) {                          // op = output array position
      let ip1: number;                                               // ip1 = start of range in input array
      if (preserveScale) {
         ip1 = (op - 0.5) / oa.length * ia.length; }
       else {
         ip1 = op / oa.length * ia.length - 0.5; }
      const ip2 = ip1 + w;                                           // ip2 = end of range in input array
      oa[op] = computeAverageOfRange(ia, ip1, ip2); }}               // compute average of range [ip1 .. ip2]

// Returns the average of the array values within the range from pos1 to pos2.
function computeAverageOfRange (a: ArrayLike<number>, pos1: number, pos2: number) : number {
   const p1 = Math.max(pos1, -0.5);                                  // clipped start position
   const p2 = Math.min(pos2, a.length - 1 + 0.5);                    // clipped end position
   if (p1 - pos1 > eps || pos2 - p2 > eps) {                       // specified range extends outside of the array range
      return NaN; }
   const w = p2 - p1;                                                // width of averaging area
   if (w < eps) {
      return NaN; }
   const p1i = Math.max(Math.round(p1), 0);                          // first input sample index
   const p2i = Math.min(Math.round(p2), a.length - 1);               // last input sample index
   if (p1i > p2i) {
      return NaN; }
   if (p1i == p2i) {                                                 // range stays within a single input sample
      return a[p1i]; }                                               // return the value of that sample
   let sum = 0;
   sum += a[p1i] * (p1i + 0.5 - p1);                                 // partial first input sample amount
   for (let i = p1i + 1; i < p2i; i++) {                             // sum up whole input samples in the middle
      sum += a[i]; }
   sum += a[p2i] * (p2 - (p2i - 0.5));                               // partial last input sample amount
   return sum / w; }                                                 // average within range [p1 .. p2]

//--- Sum-preserving resampling -----------------------------------------------

/**
* Optimized one-dimensional sum-preserving resampling (rebinning).
*
* The sum of the output values equals the sum of the input values. The sum is
* preserved exactly for `preserveScale = false`. With `preserveScale = true`,
* small edge portions of the input array may not be covered by the output array
* ranges, and their contribution to the sum is lost.
*
* This function can be used to resample the power values of a spectrum, where the
* total signal energy should be preserved.
*
* Each output value is the sum of the input values within a range of the input
* array. The range has a width of `ia.length / oa.length` input samples and is
* centered at the input position that corresponds to the output array index
* (see `preserveScale`). Input samples that are only partially covered by the
* range contribute proportionally to their covered fraction.
*
* When `preserveScale` is `true`, the mapped range can cross over the borders of the
* input array. The parts of the range that lie outside the input array are treated as zero.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the center
*    of the input range (`inputPosition`):
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
*/
export function resampleSumPreserving (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false) {
   if (handleTrivialCases(ia, oa, true)) {
      return; }
   const iLen = ia.length;
   const oLen = oa.length;
   const id = iLen * 2;
   const od = oLen * 2;
   let ip = 0;
   let op = 0;
   let d = preserveScale ? oLen - iLen : 0;                          // position delta (outPos - inPos) using integer arithmetic
   while (op < oLen) {
      let acc = 0;
      d += id;
      while (d >= od) {
         const w = Math.min(od, id + od - d);
         acc += ia[ip++] * w;
         d -= od; }
      if (d > 0 && ip < iLen) {
         acc += ia[ip] * Math.min(d, id); }
      oa[op++] = acc / od; }}

/**
* Reference implementation of one-dimensional sum-preserving resampling.
*
* This is a slow reference implementation of {@link resampleSumPreserving}. It is
* simpler to understand than the optimized implementation and produces the same result.
*
* @param ia
*    Input array.
* @param oa
*    Output array.
* @param preserveScale
*    Selects how the output array index (`outputPosition`) is mapped to the center
*    of the input range (`inputPosition`):
*  * false:<br>
*    `inputPosition = (outputPosition + 0.5) / oa.length * ia.length - 0.5`<br>
*    The array is processed symmetrically.
*  * true:<br>
*    `inputPosition = outputPosition / oa.length * ia.length`
*/
export function resampleSumPreservingRef (ia: ArrayLike<number>, oa: MutableArrayLike<number>, preserveScale = false) {
   if (handleTrivialCases(ia, oa, true)) {
      return; }
   const w = 1 / oa.length * ia.length;                              // w = width of one output cell range in the input coordinate space
   for (let op = 0; op < oa.length; op++) {                          // op = output array position
      let ip1: number;                                               // ip1 = start of range in input array
      if (preserveScale) {
         ip1 = (op - 0.5) / oa.length * ia.length; }
       else {
         ip1 = op / oa.length * ia.length - 0.5; }
      const ip2 = ip1 + w;                                           // ip2 = end of range in input array
      oa[op] = computeSumOfRange(ia, ip1, ip2); }}                   // compute sum of range [ip1 .. ip2]

// Returns the sum of the array values within the range from pos1 to pos2.
function computeSumOfRange (a: ArrayLike<number>, pos1: number, pos2: number) : number {
   const p1 = Math.max(pos1, -0.5);                                  // clipped start position
   const p2 = Math.min(pos2, a.length - 1 + 0.5);                    // clipped end position
   const w = p2 - p1;                                                // width of summing range
   if (w < eps) {
      return 0; }
   const p1i = Math.max(Math.round(p1), 0);                          // first input sample index
   const p2i = Math.min(Math.round(p2), a.length - 1);               // last input sample index
   if (p1i > p2i) {
      return 0; }
   if (p1i == p2i) {                                                 // range stays within a single input sample
      return a[p1i] * w; }                                           // return a quota of that sample
   let sum = 0;
   sum += a[p1i] * (p1i + 0.5 - p1);                                 // partial first input sample amount
   for (let i = p1i + 1; i < p2i; i++) {                             // sum up whole input samples in the middle
      sum += a[i]; }
   sum += a[p2i] * (p2 - (p2i - 0.5));                               // partial last input sample amount
   return sum; }                                                     // sum of range [p1 .. p2]
