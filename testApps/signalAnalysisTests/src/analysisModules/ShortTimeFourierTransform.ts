// Analysis module for short-time fourier transform.

import {stripIndents as strip} from "common-tags";
import * as AnalysisBase from "./AnalysisBase.js";
import Complex from "dsp-collection/math/Complex.js";
import * as Fft from "dsp-collection/signal/Fft.js";
import * as AdaptiveStft from "dsp-collection/signal/AdaptiveStft.js";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions.js";
import * as DspUtils from "dsp-collection/utils/DspUtils.js";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as Utils from "../Utils.js";
import * as DomUtils from "../DomUtils.js";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="stftVariant">Variant:</label>
    <select id="stftVariant" class="width3">
     <option value="fft">Classic FFT with a fixed window width</option>
     <option value="adaptiveStftMaxWindow" selected>Adaptive window filling the specified maximum width optimally</option>
     <option value="adaptiveStftRelWindow">Adaptive window for a fixed number of oscillations</option>
    </select>
    <label class="width1 gap1" for="windowFunction" title="Window function">Window funct.:</label>
    <select class="width1" id="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("hann")}
    </select>
    <label class="width1 gap1" for="fixedWindowWidth" title="Fixed window width in ms">Win. width [ms]:</label>
    <input class="width1" id="fixedWindowWidth" type="number" step="any">
    <label class="width1 gap1" for="maxWindowWidth" title="Maximum window width in ms">Max. width [ms]:</label>
    <input class="width1" id="maxWindowWidth" type="number" step="any">
    <label class="width1 gap1" for="relWindowWidth" title="Window width relative to wavelength. Number of oscillations for the window.">Relative width:</label>
    <input class="width1" id="relWindowWidth" type="number" min="1" required value="32">
   </div>
   <div class="parmLine">
    <label class="width1" for="xAxisMode">X-axis:</label>
    <select class="width1" id="xAxisMode">
     <option value="frequency">Frequency</option>
     <option value="wavelength">Wavelength</option>
    </select>
    <label class="width1 gap1" for="amplitudeMode">Amplitude:</label>
    <select class="width1" id="amplitudeMode">
     <option value="log">Logarithmic</option>
     <option value="lin">Linear</option>
    </select>
    <label class="width1 gap1" for="bufferedOutput">Buffered:</label>
    <input id="bufferedOutput" type="checkbox">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Short-time fourier transform variants",
   id:                  "STFT",
   f:                   main,
   formParmsHtml,
   onFormParmsChange,
   onSignalViewportChange };

function onFormParmsChange() {
   const variantId = (<HTMLSelectElement>document.getElementById("stftVariant")!).value;
   DomUtils.showElement("fixedWindowWidth", variantId == "fft");
   DomUtils.showElement("maxWindowWidth",   variantId == "adaptiveStftMaxWindow");
   DomUtils.showElement("relWindowWidth",   variantId == "adaptiveStftRelWindow");
   DomUtils.showElement("bufferedOutput",   variantId != "fft"); }

function onSignalViewportChange (viewerState: FunctionCurveViewer.ViewerState) {
   const viewportMs = Math.max(1, Math.round((viewerState.xMax - viewerState.xMin) * 1000));
   const windowWidthPlaceholder = "(" + viewportMs + ")";
   DomUtils.getInputElement("fixedWindowWidth").placeholder = windowWidthPlaceholder;
   DomUtils.getInputElement("maxWindowWidth").placeholder = windowWidthPlaceholder; }

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const sampleRate = parms.sampleRate;
   const viewportDuration = parms.viewportXMax - parms.viewportXMin;
   const defaultWindowWidthInMs = Math.round(viewportDuration * 1000);
   const windowCenterPosition = (parms.viewportXMin + parms.viewportXMax) / 2 * sampleRate;
   const windowFunctionId = DomUtils.getValue("windowFunction");
   const xAxisMode        = DomUtils.getValue("xAxisMode");
   const amplitudeMode    = DomUtils.getValue("amplitudeMode");
   const variantId        = DomUtils.getValue("stftVariant");
   const windowFunction = (windowFunctionId == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionId, {tableCacheCostLimit: 1});
   const xMax = (xAxisMode == "frequency") ? 5500 : viewportDuration;
   let frequencyWaveComponentFunction: (frequency: number) => Complex;
   switch (variantId) {
      case "fft": {
         const windowWidth = DomUtils.getValueNum("fixedWindowWidth", defaultWindowWidthInMs) / 1000 * sampleRate;
         const windowSamples = Utils.getWindowSubArrayTrunc(parms.samples, windowCenterPosition, windowWidth);
         const samples = windowFunction ? WindowFunctions.applyWindow(windowSamples, windowFunction) : windowSamples;
         const spectrum = Fft.fftRealSpectrum(samples);
         frequencyWaveComponentFunction = (frequency: number) => {
            const relativeFrequency = Math.round(samples.length * frequency / sampleRate);
            return (relativeFrequency >= 0 && relativeFrequency < spectrum.length) ? spectrum.get(relativeFrequency) : Complex.NaN; };
         break; }
      case "adaptiveStftMaxWindow": {
         const maxWindowWidth = Math.round(DomUtils.getValueNum("maxWindowWidth", defaultWindowWidthInMs) / 1000 * sampleRate);
         frequencyWaveComponentFunction = (frequency: number) => {
            const r = AdaptiveStft.getSingle_maxWindow(parms.samples, frequency / sampleRate, windowCenterPosition, maxWindowWidth, windowFunction);
            return r ? r.component : Complex.NaN; };
         break; }
      case "adaptiveStftRelWindow": {
         const relWindowWidth = DomUtils.getValueNum("relWindowWidth");
         frequencyWaveComponentFunction = (frequency: number) => {
            const r = AdaptiveStft.getSingle_relWindow(parms.samples, frequency / sampleRate, windowCenterPosition, relWindowWidth, windowFunction);
            return r ? r.component : Complex.NaN; };
         break; }
      default: {
         throw new Error("Unknown variantId."); }}
   let waveComponentFunction: (x: number) => Complex;
   switch (xAxisMode) {
      case "frequency": {
         waveComponentFunction = frequencyWaveComponentFunction;
         break; }
      case "wavelength": {
         waveComponentFunction = (wavelength: number) => frequencyWaveComponentFunction(1 / wavelength);
         break; }
      default: {
         throw new Error("Unknown xAxisMode."); }}
   if (DomUtils.getChecked("bufferedOutput") && variantId != "fft") {
      waveComponentFunction = Utils.createArrayBackedFunction(waveComponentFunction, 0, xMax, 1024, Complex.NaN); }
   const linearAmplitudeViewerFunction = (x: number) => waveComponentFunction(x).abs();
   const phaseViewerFunction = (x: number) => waveComponentFunction(x).arg();
   let amplitudeViewerFunction: FunctionCurveViewer.ViewerFunction;
   switch (amplitudeMode) {
      case "lin": {
         amplitudeViewerFunction = linearAmplitudeViewerFunction;
         break; }
      case "log": {
         amplitudeViewerFunction = (x: number) => DspUtils.convertAmplitudeToDb(linearAmplitudeViewerFunction(x));
         break; }
      default: {
         throw new Error("Unknown amplitude mode."); }}
   const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  amplitudeViewerFunction,
      xMin:            0,
      xMax:            xMax,
      yMin:            (amplitudeMode == "log") ? -90: 0,
      yMax:            (amplitudeMode == "log") ? 0 : 1,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       (xAxisMode == "frequency") ? "Hz" : "s",
      yAxisUnit:       (amplitudeMode == "log") ? "dB" : "" };
   const phaseYRange = 1.05 * Math.PI;
   const phaseViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  phaseViewerFunction,
      xMin:            0,
      xMax:            xMax,
      yMin:            -phaseYRange,
      yMax:            phaseYRange,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       (xAxisMode == "frequency") ? "Hz" : "s" };
   return {
      blocks: [
         { title:          "Amplitude",
           cssClass:       "result250",
           viewerState:    amplitudeViewerState,
           syncXPosition:  true },
         { title:          "Phase",
           cssClass:       "result100",
           viewerState:    phaseViewerState,
           syncXPosition:  true },
         ]}; }
