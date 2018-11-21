import {ViewerFunction} from "function-curve-viewer";
import {windowFunctionIndex} from "dsp-collection/signal/WindowFunctions";
import * as DspUtils from "dsp-collection/utils/DspUtils";

export function openFileOpenDialog (callback: (file: File) => void) {
   const element: HTMLInputElement = document.createElement("input");
   element.type = "file";
   element.addEventListener("change", () => {
      if (element.files && element.files.length == 1) {
         callback(element.files[0]); }});
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   (<any>document).dummyFileOpenElementHolder = element; } // to prevent garbage collection

export function loadFileData (file: File) : Promise<ArrayBuffer> {
   return new Promise<ArrayBuffer>(executor);
   function executor (resolve: Function, reject: Function) {
      const fileReader = new FileReader();
      fileReader.addEventListener("loadend", () => resolve(fileReader.result));
      fileReader.addEventListener("error", () => reject(fileReader.error));
      fileReader.readAsArrayBuffer(file); }}

// This function is used to swap a viewer function between frequency input and wavelength input.
export function createReciprocalViewerFunction (f: ViewerFunction) : ViewerFunction {
   if ((<any>f).cachedReciprocalFunction) {
      return (<any>f).cachedReciprocalFunction; }
   const f2 = function (x: number, sampleWidth: number) {
      if (!x || !sampleWidth) {
         return; }
      return f(1 / x, 1 / sampleWidth); };
   (<any>f).cachedReciprocalFunction = f2;
   (<any>f2).cachedReciprocalFunction = f;
   return f2; }

export function createHarmonicSpectrumViewerFunction (f0: number, harmonics: Float64Array) : ViewerFunction {
   const harmonicsDb = harmonics.map(DspUtils.convertAmplitudeToDb);
   const n = harmonicsDb.length;
   const lineWidth = 3;
   return (x: number, sampleWidth: number) => {
      const i = Math.round(x / f0);
      if (!(i >= 1 && i <= n)) {
         return; }
      if (Math.abs(x - i * f0) > lineWidth * sampleWidth / 2) {
         return; }
      return [-999, harmonicsDb[i - 1]]; }; }

export function createTableBackedFunction<T> (f: (x: number) => T, startValue: number, increment: number, tableSize: number, outOfRangeValue: T) : (x: number) => T {
   const table: T[] = Array(tableSize);
   for (let p = 0; p < tableSize; p++) {
      const x = startValue + p * increment;
      table[p] = f(x); }
   return function (x: number) {
      const p = Math.round((x - startValue) / increment);
      if (p < 0 || p >= tableSize) {
         return outOfRangeValue; }
      return table[p]; }; }

export function escapeHtml (s: string) : string {
   let out = "";
   let p2 = 0;
   for (let p = 0; p < s.length; p++) {
      let r: string;
      switch (s.charCodeAt(p)) {
         case 34: r = "&quot;"; break;  // "
         case 38: r = "&amp;" ; break;  // &
         case 39: r = "&#39;" ; break;  // '
         case 60: r = '&lt;'  ; break;  // <
         case 62: r = '&gt;'  ; break;  // >
         default: continue; }
      if (p2 < p) {
         out += s.substring(p2, p); }
      out += r;
      p2 = p + 1; }
   if (p2 == 0) {
      return s; }
   if (p2 < s.length) {
      out += s.substring(p2); }
   return out; }

export function genWindowFunctionOptionsHtml (defaultId: string) : string {
   let html = "";
   for (const descr of windowFunctionIndex) {
      const selected = descr.id == defaultId;
      html += `<option value="${descr.id}"${selected?" selected":""}>${escapeHtml(descr.name)}</option>`; }
   return html; }

export function scanFunctionMax (f: (x: number) => number, argMin: number, argMax: number, argIncr: number) : number {
   let maxArg: number = NaN;
   let maxVal: number = -Infinity;
   for (let x = argMin; x < argMax; x += argIncr) {
      const v = f(x);
      if (v > maxVal) {
         maxArg = x;
         maxVal = v; }}
   if (argMax > argMin && f(argMax) > maxVal) {
      maxArg = argMax; }
   return maxArg; }
