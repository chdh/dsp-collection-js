// Analysis module for short-time fourier transform.

import {stripIndents as strip} from "common-tags";
import * as AnalysisBase from "./AnalysisBase";
import * as Utils from "../Utils";
import Complex from "dsp-collection/math/Complex";
import * as Goertzel from "dsp-collection/transform/Goertzel";
import * as AdaptiveStft from "dsp-collection/transform/AdaptiveStft";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import * as FunctionCurveViewer from "function-curve-viewer";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="stftVariant">Variant:</label>
    <select id="stftVariant" name="stftVariant">
     <option value="dft">Classic DFT:&nbsp; Window size is visible signal segment</option>
     <option value="adaptiveStftMaxWindow" selected>Variable window size:&nbsp; Maximum fitting into visible signal segment, centered</option>
     <option value="adaptiveStftFixedOsc">Variable window size:&nbsp; Fixed number of oscillations, centered</option>
    </select>
    <span id="oscillationsParmBlock">
     <label class="width1 gap1" for="oscillations">Oscillations:</label>
     <input class="width1" id="oscillations" name="oscillations" type="number" min="1" value="32">
    </span>
   </div>
   <div class="parmLine">
    <label class="width1" for="windowFunction">Window:</label>
    <select class="width1" id="windowFunction" name="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("hann")}
    </select>
    <label class="width1 gap1" for="xAxisMode">X-axis:</label>
    <select class="width1" id="xAxisMode" name="xAxisMode">
     <option value="frequency">Frequency</option>
     <option value="wavelength">Wavelength</option>
    </select>
    <label class="width1 gap1" for="amplitudeMode">Amplitude:</label>
    <select class="width1" id="amplitudeMode" name="amplitudeMode">
     <option value="log">Logarithmic</option>
     <option value="lin">Linear</option>
    </select>
    <span id="bufferedOutputParmBlock">
     <label class="width1 gap1" for="bufferedOutput">Buffered:</label>
     <input id="bufferedOutput" name="bufferedOutput" type="checkbox">
    </span>
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Short-time fourier transform variants",
   id:                  "STFT",
   f:                   main,
   formParmsHtml:       formParmsHtml,
   refreshFormParms:    refreshFormParms };

function refreshFormParms() {
   const variantId = (<HTMLInputElement>document.getElementById("stftVariant")!).value;
   document.getElementById("oscillationsParmBlock")!.classList.toggle("hidden", variantId != "adaptiveStftFixedOsc");
   document.getElementById("bufferedOutputParmBlock")!.classList.toggle("hidden", variantId == "dft"); }

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const viewportDuration = parms.viewportXMax - parms.viewportXMin;
   const viewportStartPos = Math.max(0, Math.min(parms.samples.length, Math.ceil(parms.viewportXMin * parms.sampleRate)));
   const viewportEndPos = Math.max(viewportStartPos, Math.min(parms.samples.length, Math.floor(parms.viewportXMax * parms.sampleRate)));
   const viewportSamples = parms.samples.subarray(viewportStartPos, viewportEndPos);
   const windowCenterPosition = (parms.viewportXMin + parms.viewportXMax) / 2 * parms.sampleRate;
   const windowFunctionId = <string>parms.formParms.get("windowFunction");
   const windowFunction = (windowFunctionId == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionId);
   const xAxisMode = <string>parms.formParms.get("xAxisMode");
   const xMax = (xAxisMode == "frequency") ? 5000 : viewportDuration;
   const variantId = parms.formParms.get("stftVariant");
   let waveComponentFunction: (waveLength: number) => Complex;
   switch (variantId) {
      case "dft": {
         const samples = windowFunction ? WindowFunctions.applyWindow(viewportSamples, windowFunction) : viewportSamples;
         const spectrum = Goertzel.goertzelSpectrum(samples);
         waveComponentFunction = (waveLength: number) => {
            const relativeFrequency = Math.round(viewportSamples.length / (waveLength * parms.sampleRate));
            return (waveLength > 0 && relativeFrequency >= 0 && relativeFrequency < spectrum.length) ? spectrum[relativeFrequency] : Complex.NaN; };
         break; }
      case "adaptiveStftMaxWindow": {
         const maxWindowWidth = Math.floor(viewportDuration * parms.sampleRate);
         waveComponentFunction = (waveLength: number) => AdaptiveStft.stftSingleMaxWindow(parms.samples, waveLength * parms.sampleRate, windowCenterPosition, maxWindowWidth, windowFunction);
         break; }
      case "adaptiveStftFixedOsc": {
         const oscillations = Number(parms.formParms.get("oscillations"));
         waveComponentFunction = (waveLength: number) => AdaptiveStft.stftSingleFixedOsc(parms.samples, waveLength * parms.sampleRate, windowCenterPosition, oscillations, windowFunction);
         break; }
      default: {
         throw new Error("Unknown variantId."); }}
   if (xAxisMode == "frequency") {
      const temp = waveComponentFunction;
      waveComponentFunction = (frequency: number) => temp(1 / frequency); }
   if (parms.formParms.get("bufferedOutput") && variantId != "dft") {
      const tableSize = 1024;
      waveComponentFunction = Utils.createTableBackedFunction(waveComponentFunction, 0, xMax / tableSize, tableSize, Complex.NaN); }
   const linearAmplitudeViewerFunction = (waveLength: number) => waveComponentFunction(waveLength).abs();
   let amplitudeViewerFunction: FunctionCurveViewer.ViewerFunction = linearAmplitudeViewerFunction;
   const phaseViewerFunction: FunctionCurveViewer.ViewerFunction = (waveLength: number) => waveComponentFunction(waveLength).arg();
   const amplitudeMode = <string>parms.formParms.get("amplitudeMode");
   if (amplitudeMode == "log") {
      amplitudeViewerFunction = (x: number) => Math.max(-999, DspUtils.convertAmplitudeToDb(linearAmplitudeViewerFunction(x))); }
   const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  amplitudeViewerFunction,
      xMin:            0,
      xMax:            xMax,
      yMin:            (amplitudeMode == "log") ? -90: 0,
      yMax:            (amplitudeMode == "log") ? 0 : 1,
      gridEnabled:     true,
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
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       (xAxisMode == "frequency") ? "Hz" : "s" };
   return {
      blocks: [
         { title:          "Amplitude",
           cssClass:       "amplitudeResult",
           viewerState:    amplitudeViewerState,
           syncXPosition:  true },
         { title:          "Phase",
           cssClass:       "phaseResult",
           viewerState:    phaseViewerState,
           syncXPosition:  true },
         ]}; }
