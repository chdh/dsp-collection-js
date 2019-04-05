import Complex from "./Complex";
import MutableComplex from "./MutableComplex";

const emptyFloat64Array = new Float64Array(0);

/*
* An array of complex numbers.
*
* The design objective of this class is to enable speed-optimized use.
*/
export default class ComplexArray {

   public  re:     Float64Array;
   public  im:     Float64Array;
   public  length: number;

   public constructor (x: number | Complex[] | Float64Array = 0) {
      if (typeof x == "number") {
         this.constructByLength(x); }
       else if (x instanceof Float64Array) {
         this.constructByFloat64Array(x); }
       else if (x instanceof Array && x[0] instanceof Complex) {
         this.constructByArrayOfComplex(x); }
       else {
         throw new Error("Invalid constructor argument."); }}

   private constructByLength (length: number) {
      this.length = length;
      if (length) {
         this.re = new Float64Array(length);
         this.im = new Float64Array(length); }
       else {
         this.re = emptyFloat64Array;
         this.im = emptyFloat64Array; }}

   private constructByFloat64Array (a: Float64Array) {
      this.length = a.length;
      this.re = a.slice();
      this.im = new Float64Array(a.length); }

   private constructByArrayOfComplex (a: Complex[]) {
      this.length = a.length;
      this.re = new Float64Array(a.length);
      this.im = new Float64Array(a.length);
      for (let i = 0; i < a.length; i++) {
         this.re[i] = a[i].re;
         this.im[i] = a[i].im; }}

   public slice (begin?: number, end?: number) : ComplexArray {
      const a2 = new ComplexArray();
      a2.re = this.re.slice(begin, end);
      a2.im = this.im.slice(begin, end);
      a2.length = a2.re.length;
      return a2; }

   public subarray (begin: number, end: number) : ComplexArray {
      const a2 = new ComplexArray();
      a2.re = this.re.subarray(begin, end);
      a2.im = this.im.subarray(begin, end);
      a2.length = end - begin;
      return a2; }

   public set (i: number, c: Complex) {
      this.re[i] = c.re;
      this.im[i] = c.im; }

   public setReIm (i: number, re: number, im: number) {
      this.re[i] = re;
      this.im[i] = im; }

   public static copy1 (a1: ComplexArray, i1: number, a2: ComplexArray, i2: number) {
      a2.re[i2] = a1.re[i1];
      a2.im[i2] = a1.im[i1]; }

   //--- Value retrieval -------------------------------------------------------

   public toString() : string {
      let s = "[";
      for (let i = 0; i < this.length; i++) {
         if (i > 0) {
            s += ", "; }
         s += "(" + this.re[i] + ", " + this.im[i] + ")"; }
      s += "]";
      return s; }

   public get (i: number) : MutableComplex {
      return new MutableComplex(this.re[i], this.im[i]); }

   public getAbs (i: number) : number {
      return Math.hypot(this.re[i], this.im[i]); }

   public getArg (i: number) : number {
      return Math.atan2(this.im[i], this.re[i]); }

   //--- Single value operations -----------------------------------------------

   public addRealTo (i: number, x: number) {
      this.re[i] += x; }

   public addTo (i: number, x: Complex) {
      this.re[i] += x.re;
      this.im[i] += x.im; }

   public subRealFrom (i: number, x: number) {
      this.re[i] -= x; }

   public subFrom (i: number, x: Complex) {
      this.re[i] -= x.re;
      this.im[i] -= x.im; }

   public mulByReal (i: number, x: number) {
      this.re[i] *= x;
      this.im[i] *= x; }

   public mulBy (i: number, x: Complex) {
      this.setMul(i, this.re[i], this.im[i], x.re, x.im); }

   public divByReal (i: number, x: number) {
      this.re[i] /= x;
      this.im[i] /= x; }

   public divBy (i: number, x: Complex) {
      this.setDiv(i, this.re[i], this.im[i], x.re, x.im); }

   //--- Multi value operations ------------------------------------------------

   // For speed optimization, it's important to avoid allocations within the loops.

   public mulByArray (a2: ComplexArray) {
      const n = this.length;
      if (a2.length != n) {
         throw new Error("Array sizes are not equal."); }
      for (let i = 0; i < n; i++) {
         this.setMul(i, this.re[i], this.im[i], a2.re[i], a2.im[i]); }}

   public mulAllByReal (x: number) {
      const n = this.length;
      for (let i = 0; i < n; i++) {
         this.mulByReal(i, x); }}

   //--- Low-level optimization methods ----------------------------------------

   /**
   * Sets element [i] to (re1, im1) * (re2, im2).
   */
   public setMul (i: number, re1: number, im1: number, re2: number, im2: number) {
      this.re[i] = re1 * re2 - im1 * im2;
      this.im[i] = re1 * im2 + im1 * re2; }

   /**
   * Sets element [i] to (re1, im1) / (re2, im2).
   */
   public setDiv (i: number, re1: number, im1: number, re2: number, im2: number) {
      const m = re1 * re1 + im1 * im1;
      this.re[i] = (re1 * re2 + im1 * im2) / m;
      this.im[i] = (im1 * re2 - re1 * im2) / m; }

   }
