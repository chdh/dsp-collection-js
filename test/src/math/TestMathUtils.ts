import * as MathUtils from "dsp-collection/math/MathUtils";

function verifyEqual (a1: ArrayLike<number>, a2: ArrayLike<number>, eps=1E-14) {
   if (a1.length != a2.length) {
      throw new Error("Array sizes are not equal."); }
   for (let i = 0; i < a1.length; i++) {
      if (Math.abs(a1[i] - a2[i]) > eps) {
         throw new Error(`Difference detected in arrays at position ${i}: ${a1[i]} ${a2[i]}.`); }}}

const slice = Function.prototype.call.bind(Array.prototype.slice);

function verifyEqualWithoutEdges (a1: ArrayLike<number>, a2: ArrayLike<number>, edgeLen: number, eps=1E-14) {
   const a1Sub = slice(a1, edgeLen, a1.length - edgeLen);
   const a2Sub = slice(a2, edgeLen, a1.length - edgeLen);
   verifyEqual(a1Sub, a2Sub, eps); }

function test_simpleMovingAverage() {

   {
   const a1 = [2,    7,    3,    4,    1,    0,    3  ];
   const a2 = [4.5,  4,    14/3, 8/3,  5/3,  4/3,  1.5];
   const a3 = MathUtils.simpleMovingAverage(a1, 3);
   verifyEqual(a2, a3);
   }

   {
   const a1 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
   for (let windowWidth = 2; windowWidth < a1.length * 2; windowWidth++) {
      const a2 = MathUtils.simpleMovingAverage(a1, windowWidth);
      verifyEqual(a1, a2); }
   }

   console.log("test_simpleMovingAverage completed"); }

function test_triangularMovingAverage() {

   {
   const a1 = [2,             7,                 3,                 4,                 1,                 0,                 3   ];
   const a2 = [(2 + 7/2)/1.5, (2/2 + 7 + 3/2)/2, (7/2 + 3 + 4/2)/2, (3/2 + 4 + 1/2)/2, (4/2 + 1 + 0/2)/2, (1/2 + 0 + 3/2)/2, (0/2 + 3)/1.5 ];
   const a3 = MathUtils.triangularMovingAverage(a1, 4);
   const a4 = MathUtils.triangularMovingAverageRef(a1, 4);
   verifyEqualWithoutEdges(a2, a3, 1);                                         // edges are not entirely correct with fast version
   verifyEqual(a2, a4);
   }

   {
   const a1 = [0,   0,   0,   0,   0,   0,   4,   0,   0,   0,   0,   0,  0 ];
   const a2 = [0,   0,   0,   1/4, 1/2, 3/4, 1,   3/4, 1/2, 1/4, 0,   0,  0 ];
   const a3 = MathUtils.triangularMovingAverage(a1, 8);
   const a4 = MathUtils.triangularMovingAverageRef(a1, 8);
   verifyEqual(a2, a3);
   verifyEqual(a3, a4);
   }

   {
   const a1 = [0,   0,   0,   0,   4,    0,   0,         0,   6,    0,   0,         0,   3,    0,   0,   0,   0 ];
   const a2 = [NaN, NaN, NaN, NaN, 4/4,  NaN, (4+6)/2/4, NaN, 6/4,  NaN, (6+3)/2/4, NaN, 3/4,  NaN, NaN, NaN, 0 ];
   const a3 = MathUtils.triangularMovingAverage(a1, 8);
   const a4 = MathUtils.triangularMovingAverageRef(a1, 8);
   verifyEqual(a2, a3);
   verifyEqual(a2, a4);
   verifyEqualWithoutEdges(a3, a4, 3);
   }

   {
   const a1 = [8, 2, 7, 3, 5, 9, 4, 7, 5, 5, 3, 2, 5, 9, 7, 2, 5, 3, 1, 2, 8, 5, 4, 2, 3, 4, 7, 8, 2, 6, -2, 5, 2, 4, 8, 15, 2, 3, 5];
   const a3 = MathUtils.triangularMovingAverage(a1, 8);
   const a4 = MathUtils.triangularMovingAverageRef(a1, 8);
   verifyEqualWithoutEdges(a3, a4, 3);
   }

   {
   const a1 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
   for (let windowWidth = 4; windowWidth < a1.length * 2; windowWidth++) {
      const a3 = MathUtils.triangularMovingAverage(a1, windowWidth);
      const a4 = MathUtils.triangularMovingAverageRef(a1, windowWidth);
      verifyEqual(a1, a3);
      verifyEqual(a1, a4); }
   }

   console.log("test_triangularMovingAverage completed"); }

test_simpleMovingAverage();
test_triangularMovingAverage();
