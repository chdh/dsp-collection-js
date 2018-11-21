export function findFloat64ArrayMax (a: Float64Array) : number {
   if (a.length == 0) {
      return NaN; }
   let max = a[0];
   for (let p = 1; p < a.length; p++) {
      if (a[p] > max) {
         max = a[p]; }}
   return max; }

export function multiplyFloat64Arrays (a1: Float64Array, a2: Float64Array) : Float64Array {
   const n = a1.length;
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = a1[i] * a2[i]; }
   return a; }

export function divideFloat64Arrays (a1: Float64Array, a2: Float64Array) : Float64Array {
   const n = a1.length;
   const a = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      a[i] = a1[i] / a2[i]; }
   return a; }
