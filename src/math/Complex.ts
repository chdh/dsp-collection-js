import * as MathUtils from "./MathUtils.ts";

/**
* An immutable complex number.
*/
export default class Complex {

   //--- Static constants ------------------------------------------------------

   /* eslint-disable @typescript-eslint/naming-convention */

   /** The imaginary unit i. */
   public static readonly I = new Complex(0, 1);

   /** A `Complex` representing 0. */
   public static readonly ZERO = new Complex(0);

   /** A `Complex` representing 1. */
   public static readonly ONE = new Complex(1);

   /** A `Complex` representing 2. */
   public static readonly TWO = new Complex(2);

   /** A `Complex` representing "NaN + NaN i" */
   public static readonly NaN = new Complex(NaN, NaN);

   /** A `Complex` representing "+Infinity + Infinity i" */
   public static readonly INFINITY = new Complex(Infinity, Infinity);

   /* eslint-enable */

   //--- Member fields ---------------------------------------------------------

   /** Real part of the complex number. */
   public readonly re: number;

   /** Imaginary part of the complex number. */
   public readonly im: number;

   //--- Constructor -----------------------------------------------------------

   /**
   * Constructs a `Complex`.
   *
   * @param re
   *    The real part.
   * @param im
   *    The imaginary part. Optional. Default is 0.
   */
   public constructor (re: number, im: number = 0) {
      this.re = re;
      this.im = im; }

   //--- Value retrieval and value test ----------------------------------------

   /**
   * Returns a string representing the complex number.
   */
   public toString() : string {
      return "(" + this.re + ", " + this.im + ")"; }

   /**
   * Returns the real part.
   * Verifies that `abs(im) &lt;= eps` or `abs(im) &lt;= abs(re) * eps`.
   */
   public toNumber (eps: number) : number {
      const absIm = Math.abs(this.im);
      if (!(absIm <= eps || absIm <= Math.abs(this.re) * eps)) {
         throw new Error("The imaginary part of the complex number is not neglectable small for the conversion to a real number. re=" + this.re + " im=" + this.im + " eps=" + eps + "."); }
      return this.re; }

   /**
   * Returns `true` if the real part or the imaginary part is NaN.
   */
   public isNaN() : boolean {
      return isNaN(this.re) || isNaN(this.im); }

   /**
   * Returns `true` if the real or the imaginary part is infinite (positive or negative).
   */
   public isInfinite() {
      return this.re == Infinity || this.re == -Infinity || this.im == Infinity || this.im == -Infinity; }

   /**
   * Returns `true` if the real and imaginary parts are both finite.
   */
   public isFinite() {
      return isFinite(this.re) && isFinite(this.im); }

   /**
   * Returns `true` if this complex number is exactly equal to another.
   */
   public equals (x: Complex) : boolean {
      return x && this.re == x.re && this.im == x.im; }

   /**
   * Returns `true` if the real and imaginary parts of the two numbers
   * do not differ more than `eps`.
   */
   public fuzzyEquals (x: Complex, eps: number) : boolean {
      return MathUtils.fuzzyEquals(this.re, x.re, eps) && MathUtils.fuzzyEquals(this.im, x.im, eps); }

   //--- Static creator functions ----------------------------------------------

   /**
   * Creates a `Complex` of length 1 and argument `arg`.
   */
   public static expj (arg: number) : Complex {
      return new Complex(Math.cos(arg), Math.sin(arg)); }

   /**
   * Creates a `Complex` from polar coordinates.
   */
   public static fromPolar (abs: number, arg: number) : Complex {
      return new Complex(abs * Math.cos(arg), abs * Math.sin(arg)); }

   //--- Unary operations ------------------------------------------------------

   /**
   * Returns the absolute value (magnitude, vector length, radius).
   */
   public abs() : number {
      return Math.hypot(this.re, this.im); }

   /**
   * Returns the argument (angle).
   */
   public arg() : number {
      return Math.atan2(this.im, this.re); }

   /**
   * Returns the conjugate.
   */
   public conj() : Complex {
      return new Complex(this.re, -this.im); }

   /**
   * Returns the negation (`-this`).
   */
   public neg() : Complex {
      return new Complex(-this.re, -this.im); }

   /**
   * Returns the reciprocal (`1 / this`, multiplicative inverse).
   */
   public reciprocal() : Complex {
      if (this.isNaN()) {
         return Complex.NaN; }
      if (this.isInfinite()) {
         return Complex.ZERO; }
      const scale = this.re * this.re + this.im * this.im;
      if (scale == 0) {
         return Complex.INFINITY; }
      return new Complex(this.re / scale, -this.im / scale); }

   /**
   * Returns the exponential function.
   * (The Euler's number e raised to the power of this complex number).
   */
   public exp() : Complex {
      return Complex.fromPolar(Math.exp(this.re), this.im); }

   /**
   * Returns the natural logarithm (base e).
   */
   public log() : Complex {
      return new Complex(Math.log(this.abs()), this.arg()); }

   /**
   * Returns the square.
   */
   public sqr() : Complex {
      return new Complex(this.re * this.re - this.im * this.im, 2 * this.re * this.im); }

   /**
   * Returns one of the two square roots.
   */
   public sqrt() : Complex {
      if (this.re == 0 && this.im == 0) {
         return Complex.ZERO; }
      const m = this.abs();
      return new Complex(Math.sqrt((m + this.re) / 2), Math.sign(this.im) * Math.sqrt((m - this.re) / 2)); }

   //--- Binary operations -----------------------------------------------------

   /**
   * Returns `this + x`;
   */
   public addReal (x: number) : Complex {
      return new Complex(this.re + x, this.im); }

   /**
   * Returns `this + x`;
   */
   public add (x: Complex) : Complex {
      return new Complex(this.re + x.re, this.im + x.im); }

   /**
   * Returns `this - x`;
   */
   public subReal (x: number) : Complex {
      return new Complex(this.re - x, this.im); }

   /**
   * Returns `x - y`;
   */
   public static subFromReal (x: number, y: Complex) : Complex {
      return new Complex(x - y.re, -y.im); }

   /**
   * Returns `this - x`;
   */
   public sub (x: Complex) : Complex {
      return new Complex(this.re - x.re, this.im - x.im); }

   /**
   * Returns `this * x`;
   */
   public mulReal (x: number) : Complex {
      return new Complex(this.re * x, this.im * x); }

   /**
   * Returns `this * x`;
   */
   public mul (x: Complex) : Complex {
      return new Complex(this.re * x.re - this.im * x.im, this.re * x.im + this.im * x.re); }

   /**
   * Returns `this / x`;
   */
   public divReal (x: number) : Complex {
      return new Complex(this.re / x, this.im / x); }

   /**
   * Returns `this / x`;
   */
   public div (x: Complex) : Complex {
      const m = x.re * x.re + x.im * x.im;
      return new Complex((this.re * x.re + this.im * x.im) / m, (this.im * x.re - this.re * x.im) / m); }

   /**
   * Returns `x / y`;
   */
   public static divFromReal (x: number, y: Complex) : Complex {
      const m = y.re * y.re + y.im * y.im;
      return new Complex(x * y.re / m, -x * y.im / m); }

   /**
   * Returns `this` raised to the power of `x`.
   */
   public powInt (x: number) : Complex{
      if (!Number.isInteger(x)) {
         throw new Error("powInt() used with non-integer exponent."); }
      return Complex.fromPolar(Math.pow(this.abs(), x), this.arg() * x); }

   /**
   * Returns `this` raised to the power of `x`.
   */
   public powReal (x: number) : Complex {
      return this.log().mulReal(x).exp(); }

   /**
   * Returns `this` raised to the power of `x`.
   */
   public pow (x: Complex) : Complex {
      return this.log().mul(x).exp(); }

   } // end class Complex
