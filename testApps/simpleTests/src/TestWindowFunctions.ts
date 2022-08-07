// Window Functions Test - A test application for the Window functions in dsp-collection/transform/WindowFunctions

import Complex from "dsp-collection/math/Complex.js";
import ComplexArray from "dsp-collection/math/ComplexArray.js";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions.js";
import * as Fft from "dsp-collection/signal/Fft.js";
import * as DspUtils from "dsp-collection/utils/DspUtils.js";
import * as FunctionCurveViewer from "function-curve-viewer";

var windowFunctionSelectElement: HTMLSelectElement;
var normalizeElement:            HTMLInputElement;
var windowFunctionViewerElement: HTMLCanvasElement;
var windowSpectrumViewerElement: HTMLCanvasElement;

var windowFunctionViewerWidget:  FunctionCurveViewer.Widget;
var windowSpectrumViewerWidget:  FunctionCurveViewer.Widget;
var windowFunctionRaw:           WindowFunctions.WindowFunction;
var windowFunctionNormalized:    WindowFunctions.WindowFunction;

function loadWindowFunctionViewer() {
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  windowFunctionRaw,
      xMin:            -0.1,
      xMax:            1.1,
      yMin:            -0.1,
      yMax:            1.1,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x };
   windowFunctionViewerWidget.setViewerState(viewerState); }

function computeSpectrum (a1: Float64Array, amplScalingFactor: number) : Float64Array {
   // TODO: Optimize
   const n = a1.length;
   const a2 = new ComplexArray(n);
   for (let p = 0; p < n; p++) {
      a2.set(p, new Complex(a1[p])); }
   const a3 = Fft.fft(a2, true);
   const a4 = Fft.fftShift(a3);
   const logAmpl = new Float64Array(n);
   for (let p = 0; p < n; p++) {
      const a = a4.get(p).abs() / n * amplScalingFactor;
      logAmpl[p] = DspUtils.convertAmplitudeToDb(a); }
   return logAmpl; }

function loadSpectrumViewer() {
   const fftSize = 32768;                                  // number of samples for the FFT used to compute the spectrum
   const fftOversizeFactor = 256;                          // how much larger the FFT size is compared to the window size
   const windowSize = fftSize / fftOversizeFactor;         // number of samples for the window function
   const fftSamples = new Float64Array(fftSize);
   const normalize = normalizeElement.checked;
   const windowFunction = normalize ? windowFunctionNormalized : windowFunctionRaw;
   for (let p = 0; p < fftSize; p++) {
      fftSamples[p] = windowFunction(p / windowSize); }
   const spectrum = computeSpectrum(fftSamples, fftOversizeFactor);
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(spectrum, fftOversizeFactor, fftSize / 2);
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  viewerFunction,
      xMin:            -40,
      xMax:            40,
      yMin:            -130,
      yMax:            5,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      yAxisUnit:       "dB"};
   windowSpectrumViewerWidget.setViewerState(viewerState); }

function displayWindowFunction() {
   const windowFunctionId = windowFunctionSelectElement.value;
   windowFunctionRaw = WindowFunctions.getFunctionbyId(windowFunctionId, {normalize: false});
   windowFunctionNormalized = WindowFunctions.getFunctionbyId(windowFunctionId);
   // console.log("Coherent gain: " + WindowFunctions.calculateCoherentGain(windowFunctionRaw, 32768));
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
   normalizeElement            = <HTMLInputElement>document.getElementById("normalize")!;
   windowFunctionViewerElement = <HTMLCanvasElement>document.getElementById("windowFunctionViewer")!;
   windowSpectrumViewerElement = <HTMLCanvasElement>document.getElementById("windowSpectrumViewer")!;

   // Set up parameter elements:
   for (const d of WindowFunctions.windowFunctionIndex) {
      const sel = d.id == "hann";
      windowFunctionSelectElement.add(new Option(d.name, d.id, sel, sel)); }
   windowFunctionSelectElement.addEventListener("change", refresh);
   normalizeElement.addEventListener("change", refresh);

   // Set up function viewer widgets:
   windowFunctionViewerWidget = new FunctionCurveViewer.Widget(windowFunctionViewerElement);
   windowSpectrumViewerWidget = new FunctionCurveViewer.Widget(windowSpectrumViewerElement);

   displayWindowFunction(); }
