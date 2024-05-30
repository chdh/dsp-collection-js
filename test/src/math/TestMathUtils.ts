import * as MathUtils from "dsp-collection/math/MathUtils.js";

function verifyEqual (a1: ArrayLike<number>, a2: ArrayLike<number>, eps=1E-14) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (Math.abs(a1[i] - a2[i]) > eps) {
         throw new Error(`Difference detected in arrays at position ${i}: ${a1[i]} ${a2[i]}.`); }}}

function test_simpleMovingAverage() {
   const a1 = [2,    7,    3,    4,    1,    0,    3  ];
   const a2 = [4.5,  4,    14/3, 8/3,  5/3,  4/3,  1.5];
   const a3 = MathUtils.simpleMovingAverage(a1, 3);
   verifyEqual(a2, a3, 1E-3);
   console.log("test_simpleMovingAverage completed"); }

function test_triangularMovingAverage() {

   {
   const a1 = [2,            7,                3,                4,                1,                0,                3   ];
   const a2 = [NaN,          2/4 + 7/2 + 3/4,  7/4 + 3/2 + 4/4,  3/4 + 4/2 + 1/4,  4/4 + 1/2 + 0/4,  1/4 + 0/2 + 3/4,  NaN ];
   const a3 = MathUtils.triangularMovingAverage(a1, 4);
   verifyEqual(a2, a3, 1E-3);
   }

   {
   const a1 = [0,   0,   0,   0,   0,   4,   0,   0,   0,   0,   0 ];
   const a2 = [0,   0,   1/4, 1/2, 3/4, 1,   3/4, 1/2, 1/4, 0,   0 ];
   const a3 = MathUtils.triangularMovingAverage(a1, 8);
   verifyEqual(a2, a3, 1E-3);
   }

   {
   const a1 = [0,   0,   0,   0,   4,    0,   0,         0,   6,    0,   0,         0,   3,    0,   0,   0,   0 ];
   const a2 = [NaN, NaN, NaN, NaN, 4/4,  NaN, (4+6)/2/4, NaN, 6/4,  NaN, (6+3)/2/4, NaN, 3/4,  NaN, NaN, NaN, 0 ];
   const a3 = MathUtils.triangularMovingAverage(a1, 8);
   verifyEqual(a2, a3, 1E-3);
   }

   console.log("test_triangularMovingAverage completed"); }

// test_simpleMovingAverage();
test_triangularMovingAverage();
