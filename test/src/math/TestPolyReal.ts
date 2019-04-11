import * as PolyReal from "dsp-collection/math/PolyReal";
import Complex from "dsp-collection/math/Complex";

function verifyEqual (a1: number[], a2: number[], eps=0) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (Math.abs(a1[i] - a2[i]) > eps) {
         throw new Error(`Difference detected in arrays at position ${i}: ${a1[i]} ${a2[i]}.`); }}}

function verifyEvaluate (a: number[], x: Complex, expectedResult: Complex) {
   const r = PolyReal.evaluate(a, x);
   if (!r.equals(expectedResult)) {
      throw new Error(`Evaluate check failed, a=${a}, x=${x}, r=${r}, expected=${expectedResult}.`); }}

function testEvaluate() {
   verifyEvaluate([5, 3, 2], new Complex(2), new Complex(5 + 3 * 2 + 2 * 2 ** 2));
   verifyEvaluate([2, -3, 4, -5], new Complex(2, 3), new Complex(206, -6)); }

function verifyMultiply (a1: number[], a2: number[], expectedResult: number[]) {
   const a3 = PolyReal.multiply(a1, a2);
   verifyEqual(a3, expectedResult); }

function testMultiply() {
   // Examples from http://www.purplemath.com/modules/polymult3.htm
   // (-7 - 4x + 4x^2) * (3 + x) = -21 - 19x + 8x^2 + 4x^3
   verifyMultiply([-7, -4, 4], [3, 1], [-21, -19, 8, 4]);
   // (5 - 9x + 3x^2) * (-7 + 4x + 2x^2) = -35 + 83x - 47x^2 - 6x^3 + 6x^4
   verifyMultiply([5, -9, 3], [-7, 4, 2], [-35, 83, -47, -6, 6]);
   // (4 + 2x^2 + x^3) * (1 + x + 2x^3) =  4 + 4x + 2x^2 + 11x^3 + x^4 + 4x^5 + 2x^6
   verifyMultiply([4, 0, 2, 1], [1, 1, 0, 2], [4, 4, 2, 11, 1, 4, 2]); }

function main() {
   testMultiply();
   testEvaluate(); }

main();
