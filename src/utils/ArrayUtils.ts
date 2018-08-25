export function findFloat64ArrayMax (a: Float64Array) : number {
   if (a.length == 0) {
      return NaN; }
   let max = a[0];
   for (let p = 1; p < a.length; p++) {
      if (a[p] > max) {
         max = a[p]; }}
   return max; }
