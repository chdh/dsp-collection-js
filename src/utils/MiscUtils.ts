export function createMapBackedFunction<X,Y> (f: (x: X) => Y) : (x: X) => Y {
   const map = new Map();
   return function (x: X) {
      let y = map.get(x);
      if (y !== undefined) {
         return y; }
      y = f(x);
      if (y === undefined) {
         return y; }
      map.set(x, y);
      return y; }; }
