import {ViewerFunction} from "function-curve-viewer";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as Autocorrelation from "dsp-collection/signal/Autocorrelation";
import * as DspUtils from "dsp-collection/utils/DspUtils";

export function openFileOpenDialog (callback: (file: File) => unknown) {
   const element: HTMLInputElement = document.createElement("input");
   element.type = "file";
   element.addEventListener("change", () => {
      if (element.files?.length == 1) {
         callback(element.files[0]); }});
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   (<any>document).dummyFileOpenElementHolder = element; } // to prevent garbage collection

// TODO: Replace by File.arrayBuffer().
export function loadFileData (file: File) : Promise<ArrayBuffer> {
   return new Promise<ArrayBuffer>(executor);
   function executor (resolve: Function, reject: Function) {
      const fileReader = new FileReader();
      fileReader.addEventListener("loadend", () => void resolve(fileReader.result));
      fileReader.addEventListener("error", () => void reject(fileReader.error));
      fileReader.readAsArrayBuffer(file); }}

export function getNumericUrlSearchParam (usp: URLSearchParams, paramName: string, defaultValue?: number) : number | undefined {
   const s = usp.get(paramName);
   if (!s) {
      return defaultValue; }
   const v = Number(s);
   if (!isFinite(v)) {
      return defaultValue; }
   return v; }

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

// This function is used to swap a viewer function between frequency input and wavelength input.
export function createReciprocalViewerFunction (f: ViewerFunction) : ViewerFunction {
   if ((<any>f).cachedReciprocalFunction) {
      return <ViewerFunction>(<any>f).cachedReciprocalFunction; }
   const f2 = function (x: number, sampleWidth: number, channel: number) {
      if (!x || !sampleWidth) {
         return; }
      return f(1 / x, 1 / sampleWidth, channel); };
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

export function createArrayBackedFunction<T> (f: (x: number) => T, xMin: number, xMax: number, arraySize: number, outOfRangeValue: T) : (x: number) => T {
   const a: T[] = Array(arraySize);
   const increment = (xMax - xMin) / (arraySize - 1);
   for (let p = 0; p < arraySize; p++) {
      const x = xMin + p * increment;
      a[p] = f(x); }
   return function (x: number) {
      const p = Math.round((x - xMin) / increment);
      if (p < 0 || p >= arraySize) {
         return outOfRangeValue; }
      return a[p]; }; }

export function genWindowFunctionOptionsHtml (defaultId: string) : string {
   let html = "";
   for (const descr of WindowFunctions.windowFunctionIndex) {
      const selected = descr.id == defaultId;
      html += `<option value="${descr.id}"${selected?" selected":""}>${escapeHtml(descr.name)}</option>`; }
   return html; }

export function catchError (f: Function, ...args: any[]) {
   void catchErrorAsync(f, ...args); }

async function catchErrorAsync (f: Function, ...args: any[]) {
   try {
      const r = f(...args);
      if (r instanceof Promise) {
         await r; }}
    catch (error) {
      console.log(error);
      alert("Error: " + error); }}

export function fadeAudioSignal (samples: Float64Array, fadeMargin: number, windowFunction: WindowFunctions.WindowFunction) : Float64Array {
   const samples2 = samples.slice();
   fadeAudioSignalInPlace(samples2, fadeMargin, windowFunction);
   return samples2; }

export function fadeAudioSignalInPlace (samples: Float64Array, fadeMargin: number, windowFunction: WindowFunctions.WindowFunction) {
   const d = Math.min(samples.length, 2 * fadeMargin);
   for (let i = 0; i < d / 2; i++) {
      const w = windowFunction(i / d);
      samples[i] *= w;
      samples[samples.length - 1 - i] *= w; }}

export function repeatSignal (samples: Float64Array, outputLength: number) : Float64Array {
   if (samples.length >= outputLength) {
      return samples.slice(0, outputLength); }
   const a = new Float64Array(outputLength);
   for (let i = 0; i < outputLength; i++) {
      a[i] = samples[i % samples.length]; }
   return a; }

export function repeatSignalCorrelatedSuperimposed (samples: Float64Array, outputLength: number, minOverlap: number, maxOverlap: number) : Float64Array {
   if (samples.length >= outputLength) {
      return samples.slice(0, outputLength); }
   // const samplesWin = WindowFunctions.applyWindow(samples, WindowFunctions.hannWindow);
   const repetitionLength = Autocorrelation.findNonPeriodicAutocorrelationMaximum(samples, samples.length - maxOverlap, samples.length - minOverlap, false);
   // const overlap = samples.length - repetitionLength;
   const overlap = minOverlap;                             // always use minOverlap to join the segments
   // console.log(samples.length, minOverlap, maxOverlap, overlap, repetitionLength);
   const a = new Float64Array(outputLength);
   for (let i = 0; i < outputLength; i++) {
      const p = i % repetitionLength;
      if (p < overlap && i >= repetitionLength) {
         a[i] = (samples[repetitionLength + p] * (overlap - p) + samples[p] * (p + 1)) / (overlap + 1); }
       else {
         a[i] = samples[p]; }}
   return a; }

export function delay (delayTimeMs: number) {
   return new Promise((resolve: Function) => {
      setTimeout(resolve, delayTimeMs); }); }

export function getWindowSubArrayTrunc (a: Float64Array, windowCenterPosition: number, windowWidth: number) : Float64Array {
   // This version truncates the window if it overlaps the edges of the array.
   return a.subarray(Math.max(0, Math.round(windowCenterPosition - windowWidth / 2)), Math.min(a.length, Math.round(windowCenterPosition + windowWidth / 2))); }

export function openSaveAsDialog (blob: Blob, fileName: string) {
   const url = URL.createObjectURL(blob);
   const element = document.createElement("a");
   element.href = url;
   element.download = fileName;
   const clickEvent = new MouseEvent("click");
   element.dispatchEvent(clickEvent);
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   (<any>document).dummySaveAsElementHolder = element; }   // to prevent garbage collection

export function buildSinSynComponentsString (f0: number, amplitudes: Float64Array, minAmplitudeDb: number) : string {
   if (!isFinite(f0) || amplitudes.length < 1) {
      return ""; }
   let s = "";
   for (let i = 1; i <= amplitudes.length; i++) {
      const a = amplitudes[i - 1];
      const db = DspUtils.convertAmplitudeToDb(a);
      if (i == 1 || db >= minAmplitudeDb) {
         if (i == 1) {
            s += f0; }
          else {
            s += " *" + i; }
         s += "/" + Math.round(db * 10) / 10; }}
   return s; }

export function removeFileNameExtension (s: string) : string {
   const p = s.lastIndexOf(".");
   return (p > 0) ? s.substring(0, p) : s; }

export function createAudioBufferFromSamples (samples: Float64Array, sampleRate: number, audioContext: AudioContext) : AudioBuffer {
   const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
   const data = buffer.getChannelData(0);
   for (let i = 0; i < samples.length; i++) {
      data[i] = samples[i]; }
   return buffer; }
