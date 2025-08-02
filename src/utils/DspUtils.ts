// Returns -Infinity for 0.
export function convertAmplitudeToDb (x: number) : number {
   return 20 * Math.log10(x); }

// Returns -Infinity for 0.
export function convertPowerToDb (x: number) : number {
   return 10 * Math.log10(x); }

export function convertDbToAmplitude (x: number) : number {
   return Math.pow(10, x / 20); }

export function convertDbToPower (x: number) : number {
   return Math.pow(10, x / 10); }
