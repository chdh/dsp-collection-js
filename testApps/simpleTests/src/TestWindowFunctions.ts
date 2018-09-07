// Window Functions Test - A test application for the Window functions in dsp-collection/transform/WindowFunctions

import Complex from "dsp-collection/math/Complex";
import * as ArrayUtils from "dsp-collection/utils/ArrayUtils";
import * as WindowFunctions from "dsp-collection/transform/WindowFunctions";
import * as Fft from "dsp-collection/transform/Fft";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import * as FunctionCurveViewer from "function-curve-viewer";

var windowFunctionSelectElement: HTMLSelectElement;
var normalizeToMaxElement:       HTMLInputElement;
var windowFunctionViewerElement: HTMLCanvasElement;
var windowSpectrumViewerElement: HTMLCanvasElement;

var windowFunctionViewerWidget:  FunctionCurveViewer.Widget;
var windowSpectrumViewerWidget:  FunctionCurveViewer.Widget;
var windowFunction:              WindowFunctions.WindowFunction;

function loadWindowFunctionViewer() {
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  windowFunction,
      xMin:            -0.1,
      xMax:            1.1,
      yMin:            -0.1,
      yMax:            1.1,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x };
   windowFunctionViewerWidget.setViewerState(viewerState); }

function computeSpectrum (a1: Float64Array, amplScalingFactor: number, normalizeToMax: boolean) : Float64Array {
   // TODO: Optimize
   const n = a1.length;
   const a2: Complex[] = Array(n);
   for (let p = 0; p < n; p++) {
      a2[p] = new Complex(a1[p]); }
   const a3 = Fft.fft(a2, true);
   const a4 = Fft.fftShift(a3);
   const a5 = new Float64Array(n);
   for (let p = 0; p < n; p++) {
      const a = a4[p].abs() / n * amplScalingFactor;
      a5[p] = Math.max(-999, DspUtils.convertAmplitudeToDb(a)); }
   if (normalizeToMax) {
      const max = ArrayUtils.findFloat64ArrayMax(a5);
      for (let p = 0; p < n; p++) {
         a5[p] -= max; }}
   return a5; }

function loadSpectrumViewer() {
   const fftSize = 32768;                                  // number of samples for the FFT used to compute the spectrum
   const fftOversizeFactor = 256;                          // how much larger the FFT size is compared to the window size
   const windowSize = fftSize / fftOversizeFactor;         // number of samples for the window function
   const windowDistance = windowSize - 1;                  // distance from first sample to last
   const fftSamples = new Float64Array(fftSize);
   for (let p = 0; p < fftSize; p++) {
      fftSamples[p] = windowFunction(p / windowDistance); }
   const normalizeToMax = normalizeToMaxElement.checked;
   const spectrum = computeSpectrum(fftSamples, fftOversizeFactor, normalizeToMax);
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(spectrum, fftOversizeFactor, fftSize / 2);
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  viewerFunction,
      xMin:            -40,
      xMax:            40,
      yMin:            -130,
      yMax:            5,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x };
   windowSpectrumViewerWidget.setViewerState(viewerState); }

function displayWindowFunction() {
   const windowFunctionId = windowFunctionSelectElement.value;
   windowFunction = WindowFunctions.getFunctionbyId(windowFunctionId);
   loadWindowFunctionViewer();
   loadSpectrumViewer(); }

function refresh() {
   try {
      displayWindowFunction(); }
    catch (e) {
      alert("Error: " + e); }}

export function startup() {

   // Get DOM elements:
   windowFunctionSelectElement = <HTMLSelectElement>document.getElementById("windowFunctionSelect")!;
   normalizeToMaxElement       = <HTMLInputElement>document.getElementById("normalizeToMax")!;
   windowFunctionViewerElement = <HTMLCanvasElement>document.getElementById("windowFunctionViewer")!;
   windowSpectrumViewerElement = <HTMLCanvasElement>document.getElementById("windowSpectrumViewer")!;

   // Set up parameter elements:
   for (const d of WindowFunctions.windowFunctionIndex) {
      const sel = d.id == "hann";
      windowFunctionSelectElement.add(new Option(d.name, d.id, sel, sel)); }
   windowFunctionSelectElement.addEventListener("change", refresh);
   normalizeToMaxElement.addEventListener("change", refresh);

   // Set up function viewer widgets:
   windowFunctionViewerWidget = new FunctionCurveViewer.Widget(windowFunctionViewerElement);
   windowFunctionViewerWidget.connectedCallback();
   windowSpectrumViewerWidget = new FunctionCurveViewer.Widget(windowSpectrumViewerElement);
   windowSpectrumViewerWidget.connectedCallback();

   displayWindowFunction(); }
