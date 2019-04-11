import Complex from "./Complex";

/**
* A mutable complex number.
*
* This class implementation for storing complex numbers is optimized for high performance computation.
* Immutability is sacrificed in favor of fast in-place operations.
*
* When mutability is no longer needed, a `MutableComplex` can be type cast into an immutable `Complex`.
*/
export default class MutableComplex extends Complex {

   //--- Override member fields as mutable -------------------------------------

   /** Mutable real part of the complex number. */
   public re: number;

   /** Mutable imaginary part of the complex number. */
   public im: number;

   //--- Constructor -----------------------------------------------------------

   /**
   * Constructs a `MutableComplex`.
   *
   * @param re
   *    The real part. Optional. Default is 0.
   * @param im
   *    The imaginary part. Optional. Default is 0.
   */
   public constructor (re: number = 0, im: number = 0) {
      super(re, im); }

   //--- Static creator functions ----------------------------------------------

   /**
   * Creates a `MutableComplex` from a `Complex`.
   */
   public static fromComplex (x: Complex) : MutableComplex {
      return new MutableComplex(x.re, x.im); }

   /**
   * Creates a `MutableComplex` of length 1 and argument `arg`.
   * @override
   */
   public static expj (arg: number) : MutableComplex {
      return new MutableComplex(Math.cos(arg), Math.sin(arg)); }

   /**
   * Creates a `MutableComplex` from polar coordinates.
   * @override
   */
   public static fromPolar (abs: number, arg: number) : MutableComplex {
      return new MutableComplex(abs * Math.cos(arg), abs * Math.sin(arg)); }

   //--- Set -------------------------------------------------------------------

   /**
   * Sets this `MutableComplex` to the value of another `Complex`.
   */
   public set (x: Complex) {
      this.re = x.re;
      this.im = x.im; }

   /**
   * Sets this `MutableComplex` to `(re, im)`.
   */
   public setReIm (re: number, im = 0) {
      this.re = re;
      this.im = im; }

   /**
   * Sets this `MutableComplex` to `e^(j * arg)` (length 1 and argument `arg`).
   */
   public setExpj (arg: number) {
      this.re = Math.cos(arg);
      this.im = Math.sin(arg); }

   //--- Mutating in-place operations ------------------------------------------

   /**
   * Mutates this `MutableComplex` by adding a real number.
   */
   public addRealTo (x: number) {
      this.re += x; }

   /**
   * Mutates this `MutableComplex` by adding a `Complex`.
   */
   public addTo (x: Complex) {
      this.re += x.re;
      this.im += x.im; }

   /**
   * Mutates this `MutableComplex` by substracting a real number.
   */
   public subRealFrom (x: number) {
      this.re -= x; }

   /**
   * Mutates this `MutableComplex` by subtracting a `Complex`.
   */
   public subFrom (x: Complex) {
      this.re -= x.re;
      this.im -= x.im; }

   /**
   * Mutates this `MutableComplex` by multiplying a real number.
   */
   public mulByReal (x: number) {
      this.re *= x;
      this.im *= x; }

   /**
   * Mutates this `MutableComplex` by multiplying a `Complex`.
   */
   public mulBy (x: Complex) {
      this.setMul(this.re, this.im, x.re, x.im); }

   /**
   * Mutates this `MutableComplex` by dividing by a real number.
   */
   public divByReal (x: number) {
      this.re /= x;
      this.im /= x; }

   /**
   * Mutates this `MutableComplex` by dividing by a `Complex`.
   */
   public divBy (x: Complex) {
      this.setDiv(this.re, this.im, x.re, x.im); }

   //--- Low-level optimization methods ----------------------------------------

   /**
   * Sets this `MutableComplex` to (re1, im1) * (re2, im2).
   */
   public setMul (re1: number, im1: number, re2: number, im2: number) {
      this.re = re1 * re2 - im1 * im2;
      this.im = re1 * im2 + im1 * re2; }

   /**
   * Sets this `MutableComplex` to (re1, im1) / (re2, im2).
   */
   public setDiv (re1: number, im1: number, re2: number, im2: number) {
      const m = re1 * re1 + im1 * im1;
      this.re = (re1 * re2 + im1 * im2) / m;
      this.im = (im1 * re2 - re1 * im2) / m; }

   } // end class MutableComplex
