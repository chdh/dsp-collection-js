import Complex from "dsp-collection/math/Complex.js";
import MutableComplex from "dsp-collection/math/MutableComplex.js";

function test1() {
   const c1 = new Complex(1, 2);
   const c2 = c1.addReal(4);
   console.log(c2.toString());
   // c2.im = 55;
   }

function test2() {
   const c1 = new MutableComplex(1, 2);
   console.log(c1.toString());
   c1.im = 55;
   c1.mulByReal(2);
   console.log(c1.toString());
   const c2 = c1.addReal(4);
   console.log(c2.toString());
   }

test2();
