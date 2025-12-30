// Window Functions Test - A test application for the Window functions in dsp-collection/transform/WindowFunctions

import ComplexArray from "dsp-collection/math/ComplexArray";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import {WindowFunction} from "dsp-collection/signal/WindowFunctions";
import * as Fft from "dsp-collection/signal/Fft";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import * as FunctionCurveViewer from "function-curve-viewer";

var windowFunctionSelectElement: HTMLSelectElement;
var normalizeCheckboxElement:    HTMLInputElement;
var windowFunctionViewerElement: HTMLCanvasElement;
var windowSpectrumViewerElement: HTMLCanvasElement;

var windowFunctionViewerWidget:  FunctionCurveViewer.Widget;
var windowSpectrumViewerWidget:  FunctionCurveViewer.Widget;
var windowFunctionRaw:           WindowFunction;
var windowFunctionNormalized:    WindowFunction;

function loadWindowFunctionViewer() {
   const viewerState : Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  windowFunctionRaw,
      xMin:            -0.1,
      xMax:            1.1,
      yMin:            -0.1,
      yMax:            1.1,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x };
   windowFunctionViewerWidget.setViewerState(viewerState); }

function computeSpectrum (a1: Float64Array, amplScalingFactor: number) : Float64Array {
   const n = a1.length;
   const a2 = new ComplexArray(a1);
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
   const normalize = normalizeCheckboxElement.checked;
   const windowFunction = normalize ? windowFunctionNormalized : windowFunctionRaw;
   for (let p = 0; p < fftSize; p++) {
      fftSamples[p] = windowFunction(p / windowSize); }
   const spectrum = computeSpectrum(fftSamples, fftOversizeFactor);
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(spectrum, fftOversizeFactor, fftSize / 2);
   const viewerState : Partial<FunctionCurveViewer.ViewerState> = {
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
   normalizeCheckboxElement    = <HTMLInputElement>document.getElementById("normalizeCheckbox")!;
   windowFunctionViewerElement = <HTMLCanvasElement>document.getElementById("windowFunctionViewer")!;
   windowSpectrumViewerElement = <HTMLCanvasElement>document.getElementById("windowSpectrumViewer")!;

   // Set up parameter elements:
   for (const d of WindowFunctions.windowFunctionIndex) {
      const sel = d.id == "hann";
      windowFunctionSelectElement.add(new Option(d.name, d.id, sel, sel)); }
   windowFunctionSelectElement.addEventListener("change", refresh);
   normalizeCheckboxElement.addEventListener("change", refresh);

   // Set up function viewer widgets:
   windowFunctionViewerWidget = new FunctionCurveViewer.Widget(windowFunctionViewerElement);
   windowSpectrumViewerWidget = new FunctionCurveViewer.Widget(windowSpectrumViewerElement);

   displayWindowFunction(); }
