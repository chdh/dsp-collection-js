import * as PolyReal from "dsp-collection/math/PolyReal.js";
import {expand} from "dsp-collection/math/PolyReal.js";
import Complex from "dsp-collection/math/Complex.js";

function verifyEqual (a1: ArrayLike<number>, a2: ArrayLike<number>, eps=1E-14) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (Math.abs(a1[i] - a2[i]) > eps) {
         throw new Error(`Difference detected in arrays at position ${i}: ${a1[i]} ${a2[i]}.`); }}}

function verifyFractionsEqual (f1: ArrayLike<number>[], f2: ArrayLike<number>[], eps=1E-14) {
   verifyEqual(f1[0], f2[0], eps);
   verifyEqual(f1[1], f2[1], eps); }

function verifyNormalizedFractionsEqual (f1: ArrayLike<number>[], f2: ArrayLike<number>[], eps=1E-14) {
   const f1n = PolyReal.normalizeFraction(f1);
   const f2n = PolyReal.normalizeFraction(f2);
   verifyFractionsEqual(f1n, f2n, eps); }

function verifyEvaluateComplex (a: ArrayLike<number>, x: Complex, expectedResult: Complex) {
   const r = PolyReal.evaluateComplex(a, x);
   if (!r.equals(expectedResult)) {
      throw new Error(`Evaluate check failed, a=${a}, x=${x}, r=${r}, expected=${expectedResult}.`); }}

function testEvaluateComplex() {
   verifyEvaluateComplex([5, 3, 2], new Complex(2), new Complex(5 + 3 * 2 + 2 * 2 ** 2));
   verifyEvaluateComplex([2, -3, 4, -5], new Complex(2, 3), new Complex(206, -6)); }

function verifyMultiply (a1: ArrayLike<number>, a2: ArrayLike<number>, expectedResult: ArrayLike<number>) {
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

function verifyDivide (a1: ArrayLike<number>, a2: ArrayLike<number>, expectedResult: ArrayLike<number>[]) {
   const r = PolyReal.divide(a1, a2);
   verifyEqual(r[0], expectedResult[0]);
   verifyEqual(r[1], expectedResult[1]); }

function testDivide() {

   // Examples from https://docs.scipy.org/doc/numpy/reference/generated/numpy.polynomial.polynomial.polydiv.html#numpy.polynomial.polynomial.polydiv
   // (1 + 2x + 3x^2) / (3 + 2x + x^2) = 3 with remainder -8 - 4x
   verifyDivide([1, 2, 3], [3, 2, 1], [[3], [-8, -4]]);
   // (3 + 2x + x^2) / (1 + 2x + 3x^2) = 1/3 with remainder 8/3 + 4/3 x
   verifyDivide([3, 2, 1], [1, 2, 3], [[1/3], [8/3, 4/3]]);

   // Examples from https://www.frustfrei-lernen.de/mathematik/polynomdivision.html
   // (6 - 5x - 2x^2 + x^3) / (-1 + x) = -6 - x + x^2
   verifyDivide([6, -5, -2, 1], [-1, 1], [[-6, -1, 1], [0]]);
   // (-12 + 7x - 10x^2 + 3x^3) / (-3 + x) = 4 - x + 3x^2
   verifyDivide([-12, 7, -10, 3], [-3, 1], [[4, -1, 3], [0]]);

   // Example from https://en.wikipedia.org/wiki/Polynomial_long_division
   // (-4 - 2x^2 + x^3) / (-3 + x) = 3 + x + x^2) with remainder 5
   verifyDivide([-4, 0, -2, 1], [-3, 1], [[3, 1, 1], [5]]);

   // Example from https://de.wikipedia.org/wiki/Polynomdivision
   // (-1 + x^2 + 2x^3 - x^4 + 4x^5) / (1 + x^2) = (2 - 2x - x^2 + 4x^3) with remainder -3 + 2x
   verifyDivide([-1, 0, 1, 2, -1, 4], [1, 0, 1], [[2, -2, -1, 4], [-3, 2]]); }

function verifyGcd (a1: ArrayLike<number>, a2: ArrayLike<number>, expectedResult: ArrayLike<number>) {
   const r = PolyReal.gcd(a1, a2, 1E-12);
   verifyEqual(r, expectedResult); }

function verifyGcdZeros (zeros1: ArrayLike<number>, zeros2: ArrayLike<number>, expectedGcdZeros: ArrayLike<number>) {
   verifyGcd(expand(zeros1), expand(zeros2), expand(expectedGcdZeros)); }

function testGcd() {

   // Example from https://en.wikipedia.org/wiki/Polynomial_greatest_common_divisor
   // gcd(6 + 7x + x^2, -6 - 5x + x^2) = 1 + x
   verifyGcd([6, 7, 1], [-6, -5, 1], [1, 1]);

   // Example from https://en.wikipedia.org/wiki/Euclidean_algorithm
   // gcd(14 - 3x + 4x^2 - 4x^3 + x^4, 6 + 17x + 12x^2 + 8x^3 + x^4) = 2 + x + x^2
   verifyGcd([14, -3, 4, -4, 1], [6, 17, 12, 8, 1], [2, 1, 1]);

   // Examples with known zeros:
   verifyGcdZeros([1, 2], [2, 3, 4], [2]);
   verifyGcdZeros([1, 2, 3], [4, 5, 6], []);
   verifyGcdZeros([1, 2, 3], [3, 2, 1], [2, 3, 1]);
   verifyGcdZeros([8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3], [5, -3, -5, 0, 11, 2], [-3, 0, 2, 5]);
   verifyGcdZeros([0, 1, 2, 2, 2, 3, 0, 0], [0, 0, 0, 3, 2, 2, 1], [0, 0, 0, 1, 2, 2, 3]);

   // Non-monic example:
   verifyGcd([12, 14, 2], [18, 15, -3], [1, 1]); }

function verifyAddFractions (f1: ArrayLike<number>[], f2: ArrayLike<number>[], expectedResult: ArrayLike<number>[]) {
   const r = PolyReal.addFractions(f1, f2);
   verifyNormalizedFractionsEqual(r, expectedResult); }

function testAddFractions() {

   // Same denoninator:
   // (1 + 2x + 3x^2) / (4 + 5x + 6x^2) + (2 + 3x + 4x^2) / (4 + 5x + 6x^2) = (3 + 5x + 7x^2) / (4 + 5x + 6x^2)
   verifyAddFractions([[1, 2, 3], [4, 5, 6]], [[2, 3, 4], [4, 5, 6]], [[3, 5, 7], [4, 5, 6]]);

   // Left denominator is a multiple of right denominator:
   // (1 + 2x) / (2x + 3x^2) + (5 + 7x) / (2 + 3x) = (1 + 7x + 7x^2) / (2x + 3x^2)
   verifyAddFractions([[1, 2], [0, 2, 3]], [[5, 7], [2, 3]], [[1, 7, 7], [0, 2, 3]]);

   // Right denominator is a multiple of left denominator:
   // (5 + 7x - 8x^3) / (2 + 3x) + (1 + 2x) / (4x + 6x^2) = (1 + 12x + 14x^2 + 16x^4) / (4x + 6x^2)
   verifyAddFractions([[5, 7, 0, 8], [2, 3]], [[1, 2], [0, 4, 6]], [[1, 12, 14, 0, 16], [0, 4, 6]]);

   // Denominator GCD is 1:
   // (1 + 2x) / ((x - 1) * (x - 2)) + (3 + 4x) / ((x + 4) * (x - 7)) = (-22 - 60x - 14x^2 + 6x^3) / ((x + 4) * (x - 1) * (x - 2) * (x - 7))
   // https://www.wolframalpha.com/input/?i=(1+%2B+2x)+%2F+((x+-+1)+*+(x+-+2))+%2B+(3+%2B+4x)+%2F+((x+%2B+4)+*+(x+-+7))
   verifyAddFractions([[1, 2], expand([1, 2])], [[3, 4], expand([-4, 7])], [[-22, -60, -14, 6], expand([-4, 1, 2, 7])]);

   // Common denominator (x - 2):
   // (1 + 2x) / ((x - 1) * (x - 2)) + (3 + 4x) / ((x - 2) * (x - 7)) = (-10 - 14x + 6x^2) / ((x - 1) * (x - 2) * (x - 7))
   // https://www.wolframalpha.com/input/?i=(1+%2B+2x)+%2F+((x+-+1)+*+(x+-+2))+%2B+(3+%2B+4x)+%2F+((x+-+2)+*+(x+-+7))
   verifyAddFractions([[1, 2], expand([1, 2])], [[3, 4], expand([2, 7])], [[-10, -14, 6], expand([1, 2, 7])]); }

function main() {
   testEvaluateComplex();
   testMultiply();
   testDivide();
   testGcd();
   testAddFractions(); }

main();
