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

   //--- Mutating in-place operations ------------------------------------------

   /**
   * Sets this `MutableComplex` to the value of another `Complex`.
   */
   public set (x: Complex) {
      this.re = x.re;
      this.im = x.im; }

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
      const re = this.re * x.re - this.im * x.im;
      const im = this.re * x.im + this.im * x.re;
      this.re = re;
      this.im = im; }

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
      const m = x.re * x.re + x.im * x.im;
      const re = (this.re * x.re + this.im * x.im) / m;
      const im = (this.im * x.re - this.re * x.im) / m;
      this.re = re;
      this.im = im; }

   } // end class MutableComplex
