/**
* Envelope detection.
*/

import * as MathUtils from "../math/MathUtils.js";

/**
* A simple signal envelope generator using moving averages.
*
* The following steps are performed to generate the signal envelope:
*
* 1. The DC level of the window is calculated using a simple moving average.
* 2. The signal values are subtracted from the DC values and rectified.
* 3. A second simple moving average is used to calculate the envelope amplitude values.
*
* @param signal
*    The input signal.
* @param windowWidthDc
*    Window width for moving average for calculating the DC component.
* @param windowWidthEnvelope
*    Window width for moving average for envelope generation.
* @returns
*    The envelope of the signal.
*/
export function generateSignalEnvelope (signal: Float64Array, windowWidthDc: number, windowWidthEnvelope: number) : Float64Array {
   const a1 = MathUtils.movingAverage(signal, windowWidthDc);      // calculate DC level
   for (let i = 0; i < a1.length; i++) {
      a1[i] = Math.abs(signal[i] - a1[i]); }                       // subtract DC from signal and rectify
   const a2 = MathUtils.movingAverage(a1, windowWidthEnvelope);    // moving average to get envelope
   return a2; }
