// Returns -Infinity for 0.
export function convertAmplitudeToDb (v: number) {
   return 20 * Math.log10(v); }

export function convertDbToAmplitude (v: number) {
   return Math.pow(10, v / 20); }
