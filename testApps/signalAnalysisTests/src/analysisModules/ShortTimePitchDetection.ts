// Analysis module for short time pitch detection.

import {stripIndents as strip} from "common-tags";
import * as AnalysisBase from "./AnalysisBase";
import * as Utils from "../Utils";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as AdaptiveStft from "dsp-collection/transform/AdaptiveStft";
import * as Autocorrelation from "dsp-collection/signal/Autocorrelation";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import * as FunctionCurveViewer from "function-curve-viewer";

const sinSynUrlBase = "http://www.source-code.biz/sinSyn/#components=";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="stpdVariant">Variant:</label>
    <select id="stpdVariant" name="stpdVariant">
     <option value="harmInt">Harmonic integration of visible signal segment</option>
     <option value="autoCor">Autocorrelation of visible signal segment</option>
     <option value="autoCorWin">Autocorrelation with window compensation</option>
    </select>
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
    <label class="width1 gap1" for="f0Min">F0 min. [Hz]:</label>
    <input class="width1" id="f0Min" name="f0Min" type="number" step="any" value="75">
    <label class="width1 gap1" for="f0Max">F0 max. [Hz]:</label>
    <input class="width1" id="f0Max" name="f0Max" type="number" step="any" value="900">
    <label class="width1 gap1" for="fCutoff">Cutoff freq. [Hz]:</label>
    <input class="width1" id="fCutoff" name="fCutoff" type="number" step="any" value="5000">
   </div>
   <div class="parmLine harmInt">
    <label class="width1" for="amplitudeCompressionExponent">Amplitude exp.:</label>
    <input class="width1" id="amplitudeCompressionExponent" name="amplitudeCompressionExponent" type="number" step="any" value="0.25" title="Amplitude compression exponent">
    <label class="width1 gap1" for="harmonicsDeclineExponent">Decline exp.:</label>
    <input class="width1" id="harmonicsDeclineExponent" name="harmonicsDeclineExponent" type="number" step="any" value="-1.25" title="Harmonics decline exponent">
    <label class="width1 gap1" for="bufferedOutput">Buffered:</label>
    <input id="bufferedOutput" name="bufferedOutput" type="checkbox">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Short-time pitch detection",
   id:                  "STPD",
   f:                   main,
   formParmsHtml:       formParmsHtml,
   refreshFormParms:    refreshFormParms };

function refreshFormParms() {
   const variantId = (<HTMLInputElement>document.getElementById("stpdVariant")!).value;
   for (const e of document.querySelectorAll(".harmInt")) {
      e.classList.toggle("hidden", variantId != "harmInt"); }}

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const viewportDuration = parms.viewportXMax - parms.viewportXMin;
   const viewportStartPos = Math.max(0, Math.min(parms.samples.length, Math.ceil(parms.viewportXMin * parms.sampleRate)));
   const viewportEndPos = Math.max(viewportStartPos, Math.min(parms.samples.length, Math.floor(parms.viewportXMax * parms.sampleRate)));
   const viewportSamples = parms.samples.subarray(viewportStartPos, viewportEndPos);
   const windowFunctionId = <string>parms.formParms.get("windowFunction");
   const windowFunctionAll = WindowFunctions.getFunctionbyId(windowFunctionId);
   const windowFunction = (windowFunctionId == "rect") ? undefined : windowFunctionAll;
   const xAxisMode = <string>parms.formParms.get("xAxisMode");
   const variantId = parms.formParms.get("stpdVariant");
   let wavelengthPitchFunction: (waveLength: number) => number;
   const f0Min = Number(parms.formParms.get("f0Min"));
   const f0Max = Number(parms.formParms.get("f0Max"));
   const fCutoff = Number(parms.formParms.get("fCutoff"));
   const xMax = (xAxisMode == "frequency") ? f0Max : viewportDuration;
   let yMin: number;
   let yMax: number;
   switch (variantId) {
      case "harmInt": {
         const amplitudeCompressionExponent = Number(parms.formParms.get("amplitudeCompressionExponent"));
         const harmonicsDeclineExponent = Number(parms.formParms.get("harmonicsDeclineExponent"));
         wavelengthPitchFunction = (waveLength: number) =>
            (waveLength > 1 / f0Min || waveLength < 1 / f0Max) ? NaN :
               computeHarmonicIntegral(viewportSamples, waveLength * parms.sampleRate, amplitudeCompressionExponent, harmonicsDeclineExponent, parms.sampleRate / fCutoff, windowFunction);
         yMin = 0;
         yMax = 1.5;
         break; }
      case "autoCor": {
         const windowedSamples = windowFunction ? WindowFunctions.applyWindow(viewportSamples, windowFunction) : viewportSamples;
         const autoCorr = Autocorrelation.nonPeriodicAutocorrelation(windowedSamples, true);
         wavelengthPitchFunction = (waveLength: number) => autoCorr[Math.round(waveLength * parms.sampleRate)];
         yMin = -1.1;
         yMax = 1.1;
         break; }
      case "autoCorWin": {
         const autoCorr = Autocorrelation.windowedNonPeriodicAutocorrelation(viewportSamples, windowFunctionAll, true);
         wavelengthPitchFunction = (waveLength: number) => autoCorr[Math.round(waveLength * parms.sampleRate)];
         yMin = -1.1;
         yMax = 1.1;
         break; }
      default: {
         throw new Error("Unknown variantId."); }}
   const frequencyPitchFunction = (frequency: number) => wavelengthPitchFunction(1 / frequency);
   const pitchFrequency = findPitchFunctionMax(frequencyPitchFunction, f0Min, f0Max);
   const pitchInfo = pitchFrequency + " Hz / " + (Math.round(1 / pitchFrequency * 1E5) / 1E2) + " ms";
   const harmonics = getHarmonicSpectrum(viewportSamples, parms.sampleRate / pitchFrequency, parms.sampleRate / fCutoff, windowFunction);
   const harmonicsViewerFunction = Utils.createHarmonicSpectrumViewerFunction(pitchFrequency, harmonics);
   const sinSynComponents = buildSinSynComponentsString(pitchFrequency, harmonics);
   const sinSynUrl = sinSynUrlBase + encodeURIComponent(sinSynComponents);
   let pitchFunction = (xAxisMode == "frequency") ? frequencyPitchFunction : wavelengthPitchFunction;
   if (parms.formParms.get("bufferedOutput") && variantId == "harmInt") {
      const tableSize = 1024;
      pitchFunction = Utils.createTableBackedFunction(pitchFunction, 0, xMax / tableSize, tableSize, NaN); }
   const pitchViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  pitchFunction,
      xMin:            0,
      xMax:            xMax,
      yMin:            yMin,
      yMax:            yMax,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       (xAxisMode == "frequency") ? "Hz" : "s"};
   const harmonicsViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  harmonicsViewerFunction,
      xMin:            0,
      xMax:            fCutoff,
      yMin:            -90,
      yMax:            0,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "Hz"};
   return {
      blocks: [
         { title:          "Pitch &nbsp; max=" + pitchInfo,
           cssClass:       "amplitudeResult",
           viewerState:    pitchViewerState},
         { title:          "Harmonic spectrum &nbsp; <a href=\"" + sinSynUrl + "\">SinSyn</a>" ,
           cssClass:       "amplitudeResult",
           viewerState:    harmonicsViewerState},
         ]}; }

/**
* Returns an integral of the harmonics of a fundamental frequency.
*
* @param samples
*    The input signal segment.
* @param fundamentalWaveLength
*    The wavelength (in sample positions) of the fundamental frequency component.
* @param harmonicsDeclineExponent
*    A parameter used to decline the amplitude of the harmonics.
* @param curoffWaveLength
*    The limit up to which the harmonics are integrated.
* @return
*    A weighting factor for the harmonic components of the specified wavelength.
*/
function computeHarmonicIntegral (samples: Float64Array, fundamentalWaveLength: number,
      amplitudeCompressionExponent:  number, harmonicsDeclineExponent: number, cutoffWaveLength: number,
      windowFunction: WindowFunctions.WindowFunction | undefined) : number {
   let sum = 0;
   let i = 1;
   while (true) {
      const waveLength = fundamentalWaveLength / i;
      if (waveLength <= cutoffWaveLength) {
         break; }
      const c = AdaptiveStft.stftSingleMaxWindow2(samples, waveLength, windowFunction);
      sum += c.abs() ** amplitudeCompressionExponent * i ** harmonicsDeclineExponent;
      i++; }
   return sum; }

function findPitchFunctionMax (frequencyPitchFunction: (frequency: number) => number, f0Min: number, f0Max: number) : number {
   const x1 = Utils.scanFunctionMax(frequencyPitchFunction, f0Min, f0Max, 1);
   // (Temporary solution, as long as the pitch detection does not have a finer resolution.)
   return x1; }

function getHarmonicSpectrum (samples: Float64Array, fundamentalWaveLength: number, minWavelength: number, windowFunction: WindowFunctions.WindowFunction | undefined) : Float64Array {
   if (!isFinite(fundamentalWaveLength)) {
      return new Float64Array(0); }
   const n = Math.floor(fundamentalWaveLength / minWavelength);
   const amplitudes = new Float64Array(n);
   for (let harmonic = 1; harmonic <= n; harmonic++) {
      const c = AdaptiveStft.stftSingleMaxWindow2(samples, fundamentalWaveLength / harmonic, windowFunction);
      amplitudes[harmonic - 1] = c.abs(); }
   return amplitudes; }

function buildSinSynComponentsString (f0: number, harmonics: Float64Array) : string {
   if (!isFinite(f0) || harmonics.length < 1) {
      return ""; }
   let s = "";
   for (let i = 1; i <= harmonics.length; i++) {
      const a = harmonics[i - 1];
      const db = DspUtils.convertAmplitudeToDb(a);
      if (i == 1 || db > -80) {
         if (i == 1) {
            s += f0; }
          else {
            s += " *" + i; }
         s += "/" + Math.round(db * 10) / 10; }}
   return s; }
