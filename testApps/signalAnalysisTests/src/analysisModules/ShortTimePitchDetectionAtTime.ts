// Analysis module for short time pitch detection at a fixed point in time.

import {stripIndents as strip} from "common-tags";
import * as AnalysisBase from "./AnalysisBase.js";
import * as PitchDetectionHarm from "dsp-collection/signal/PitchDetectionHarm.js";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions.js";
import * as AdaptiveStft from "dsp-collection/signal/AdaptiveStft.js";
import * as InstFreq from "dsp-collection/signal/InstFreq.js";
import * as Autocorrelation from "dsp-collection/signal/Autocorrelation.js";
import * as ArrayUtils from "dsp-collection/utils/ArrayUtils.js";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as Utils from "../Utils.js";
import * as DomUtils from "../DomUtils.js";

const sinSynUrlBase = "http://www.source-code.biz/sinSyn/#components=";

const defaultHarmSumParms = PitchDetectionHarm.getDefaultHarmonicInstSumParms();

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="stpdVariant">Variant:</label>
    <select id="stpdVariant" class="width3">
     <option value="harmSumRel">Harmonic sum with F0-relative window</option>
     <option value="harmSumInst">Harmonic sum with instantaneous frequency peak shaping</option>
<!-- <option value="instIntV1">Instantaneous frequency integration V1</option> -->
     <option value="harmSumFix">Harmonic sum with fixed width window</option>
     <option value="autoCor">Autocorrelation</option>
     <option value="autoCorWin">Autocorrelation with window compensation</option>
    </select>
    <label class="width1 gap1" for="windowFunction" title="Window function">Window funct.:</label>
    <select class="width1" id="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("hann")}
    </select>
    <label class="width1 gap1" for="relWindowWidth" title="Window width relative to F0 wavelength.">Relative window:</label>
    <input class="width1" id="relWindowWidth" type="number" min="1" required value="${defaultHarmSumParms.relWindowWidth}">
    <label class="width1 gap1" for="maxWindowWidth" title="Maximum window width in ms">Win. width [ms]:</label>
    <input class="width1" id="maxWindowWidth" type="number" step="any">
   </div>
   <div class="parmLine">
    <label class="width1" for="f0Min">F0 min. [Hz]:</label>
    <input class="width1" id="f0Min" type="number" step="any" min="1" required value="75">
    <label class="width1 gap1" for="f0Max">F0 max. [Hz]:</label>
    <input class="width1" id="f0Max" type="number" step="any" required value="900">
    <label class="width1 gap1" for="fCutoff" title="Cutoff frequency in Hz. Specifies a hard upper frequency limit up to which the harmonic amplitudes are evaluated.">Cutoff freq. [Hz]:</label>
    <input class="width1" id="fCutoff" type="number" step="any" required value="${defaultHarmSumParms.fCutoff}">
    <label class="width1 gap1" for="xAxisMode">X-axis:</label>
    <select class="width1" id="xAxisMode">
     <option value="frequency">Frequency</option>
     <option value="wavelength">Wavelength</option>
    </select>
   </div>
   <div class="parmLine" id="sumParms">
    <label class="width1" for="amplitudeCompressionExponent" title="Amplitude compression exponent">Amplitude exp.:</label>
    <input class="width1" id="amplitudeCompressionExponent" type="number" step="any" required>
    <label class="width1 gap1" for="harmonicsDeclineRate" title="Decline rate for harmonics integration. Initial negative slope of the decline curve.">Decline rate:</label>
    <input class="width1" id="harmonicsDeclineRate" type="number" step="any" required>
    <label class="width1 gap1" for="harmonicsDeclineExponent" title="Hyperbolic decline exponent constant for harmonics integration. 1 for harmonic decline. -1 for linear decline (with clipping to 0). 0 for exponential decline. Between 0 and 1 for hyperbolic decline.">Decline exp.:</label>
    <input class="width1" id="harmonicsDeclineExponent" type="number" step="any" required>
    <label class="width1 gap1" for="bufferedOutput">Buffered:</label>
    <input id="bufferedOutput" type="checkbox">
   </div>
   <div class="parmLine" id="instParms">
    <label class="width1" for="shiftFactor" title="Shift factor, relative to the wavelength of the frequency. Used for measuring the phase delta.">Shift factor:</label>
    <input class="width1" id="shiftFactor" type="number" min="0" max="1" step="any" required value="${defaultHarmSumParms.shiftFactor}">
    <label class="width1 gap1" for="maxFreqDev" title="Maximum frequency deviation factor">Max. freq. dev.:</label>
    <input class="width1" id="maxFreqDev" type="number" step="any" value="0.2" required>
    <label class="width1 gap1" for="frequencyResolution" title="Number of frequencies to measure within the range [F0min .. cutoffFrequency]">Freq. resolution:</label>
    <input class="width1" id="frequencyResolution" type="number" value="2000" required>
    <label class="width1 gap1" for="peakWidthFactor" title="Relative peak width factor, used for peak shaping of instantaneous amplitudes. Specifies the peak width relative to F0.">Peak width:</label>
    <input class="width1" id="peakWidthFactor" type="number" step="any" required value="${defaultHarmSumParms.peakWidthFactor}">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Short-time pitch detection at a fixed point in time",
   id:                  "PitchDetectionHarmAtTime",
   f:                   main,
   formParmsHtml,
   onFormParmsChange,
   onSignalViewportChange };

function onFormParmsChange (event?: Event) {
   const windowFunctionElement               = (<HTMLSelectElement>document.getElementById("windowFunction")!);
   const amplitudeCompressionExponentElement = (<HTMLInputElement>document.getElementById("amplitudeCompressionExponent")!);
   const harmonicsDeclineRateElement         = (<HTMLInputElement>document.getElementById("harmonicsDeclineRate")!);
   const harmonicsDeclineExponentElement     = (<HTMLInputElement>document.getElementById("harmonicsDeclineExponent")!);
   const variantId = (<HTMLSelectElement>document.getElementById("stpdVariant")!).value;
   const useRelWindowWidth = variantId == "harmSumRel" || variantId == "harmSumInst";
   DomUtils.showElement("sumParms",            variantId == "harmSumFix" || variantId == "harmSumRel" || variantId == "instIntV1" || variantId == "harmSumInst");
   DomUtils.showElement("relWindowWidth",      useRelWindowWidth);
   DomUtils.showElement("maxWindowWidth",      !useRelWindowWidth);
   DomUtils.showElement("bufferedOutput",      variantId == "harmSumFix" || variantId == "harmSumRel" || variantId == "harmSumInst");
   DomUtils.showElement("instParms",           variantId == "instIntV1" || variantId == "harmSumInst");
   DomUtils.showElement("maxFreqDev",          variantId == "instIntV1");
   DomUtils.showElement("frequencyResolution", variantId == "instIntV1");
   DomUtils.showElement("peakWidthFactor",     variantId == "harmSumInst");
   const changedFieldId = (<any>event?.target)?.id;
   if (changedFieldId == "stpdVariant" || !changedFieldId) {
      windowFunctionElement.value               = "hann";
      amplitudeCompressionExponentElement.valueAsNumber = defaultHarmSumParms.amplitudeCompressionExponent;
      harmonicsDeclineRateElement.valueAsNumber         = defaultHarmSumParms.harmonicsDeclineRate;
      harmonicsDeclineExponentElement.valueAsNumber     = defaultHarmSumParms.harmonicsDeclineExponent;
      switch (variantId) {
         case "instIntV1": {
            windowFunctionElement.value               = "flatTop";
            break; }}}}

function onSignalViewportChange (viewerState: FunctionCurveViewer.ViewerState) {
   const viewportMs = Math.max(1, Math.round((viewerState.xMax - viewerState.xMin) * 1000));
   const windowWidthPlaceholder = "(" + viewportMs + ")";
   DomUtils.getInputElement("maxWindowWidth").placeholder = windowWidthPlaceholder; }

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const sampleRate = parms.sampleRate;
   const centerPos = (parms.viewportXMax + parms.viewportXMin) / 2;
   const viewportDuration = parms.viewportXMax - parms.viewportXMin;
   const defaultWindowWidthInMs = Math.round(viewportDuration * 1000);
   const windowFunctionId    = DomUtils.getValue("windowFunction");
   const xAxisMode           = DomUtils.getValue("xAxisMode");
   const variantId           = DomUtils.getValue("stpdVariant");
   const f0Min               = DomUtils.getValueNum("f0Min");
   const f0Max               = DomUtils.getValueNum("f0Max");
   const fCutoff             = DomUtils.getValueNum("fCutoff");
   const maxWindowWidthParm  = DomUtils.getValueNum("maxWindowWidth", defaultWindowWidthInMs) / 1000;
   const maxFreqDev          = DomUtils.getValueNum("maxFreqDev");
   const frequencyResolution = DomUtils.getValueNum("frequencyResolution");
   const windowFunctionAll = WindowFunctions.getFunctionbyId(windowFunctionId, {tableCacheCostLimit: 1});
   const windowFunction = (windowFunctionId == "rect") ? undefined : windowFunctionAll;
   const harmSumParms: PitchDetectionHarm.HarmonicInstSumParms = {
      amplitudeCompressionExponent: DomUtils.getValueNum("amplitudeCompressionExponent"),
      harmonicsDeclineRate:         DomUtils.getValueNum("harmonicsDeclineRate"),
      harmonicsDeclineExponent:     DomUtils.getValueNum("harmonicsDeclineExponent"),
      fCutoff,
      relWindowWidth:               DomUtils.getValueNum("relWindowWidth"),
      windowFunction,
      shiftFactor:                  DomUtils.getValueNum("shiftFactor"),
      peakWidthFactor:              DomUtils.getValueNum("peakWidthFactor") };
   let yMin: number = 0;
   let yMax: number = -1;
   let buffered = false;
   let salienceFunction: (frequency: number) => number;
   let pitchFrequency = -1;
   switch (variantId) {

      case "harmSumFix":
      case "harmSumRel": {
         salienceFunction = (f0: number) => {
            if (f0 < f0Min || f0 > f0Max) {
               return NaN; }
            if (variantId == "harmSumFix") {
               harmSumParms.relWindowWidth = Math.floor(maxWindowWidthParm * f0); }
            return PitchDetectionHarm.harmonicSum(parms.samples, sampleRate, centerPos, f0, harmSumParms); };
         break; }

      case "instIntV1": {
         const r = calculatePitchByInstantaneousFrequencyIntegration(parms.samples, sampleRate, centerPos,
               f0Min, f0Max, harmSumParms.fCutoff, maxFreqDev, frequencyResolution, harmSumParms.shiftFactor, maxWindowWidthParm, windowFunction, harmSumParms);
         salienceFunction = (frequency: number) => {
            const p = Math.round((frequency - f0Min) / r.bufIncr);
            return (p >= 0 && p < r.buf.length) ? r.buf[p] : NaN; };
         const maxPos = ArrayUtils.argMax(r.buf);
         pitchFrequency = Math.round(f0Min + maxPos * r.bufIncr);
         yMax = r.buf[maxPos] * 1.1;
         buffered = true;
         break; }

      case "harmSumInst": {
         salienceFunction = (f0: number) => {
            if (f0 < f0Min || f0 > f0Max) {
               return NaN; }
            return PitchDetectionHarm.harmonicInstSum(parms.samples, sampleRate, centerPos, f0, harmSumParms); };
         break; }

      case "autoCor": {
         const windowSamples = Utils.getWindowSubArrayTrunc(parms.samples, centerPos * sampleRate, maxWindowWidthParm * sampleRate);
         const windowedSamples = windowFunction ? WindowFunctions.applyWindow(windowSamples, windowFunction) : windowSamples;
         const autoCorr = Autocorrelation.nonPeriodicAutocorrelation(windowedSamples, true);
         salienceFunction = (frequency: number) => autoCorr[Math.round(sampleRate / frequency)];
         yMin = -1.1;
         yMax = 1.1;
         buffered = true;
         break; }

      case "autoCorWin": {
         const windowSamples = Utils.getWindowSubArrayTrunc(parms.samples, centerPos * sampleRate, maxWindowWidthParm * sampleRate);
         const autoCorr = Autocorrelation.windowedNonPeriodicAutocorrelation(windowSamples, windowFunctionAll, true);
         salienceFunction = (frequency: number) => autoCorr[Math.round(sampleRate / frequency)];
         yMin = -1.1;
         yMax = 1.1;
         buffered = true;
         break; }

      default: {
         throw new Error("Unknown variantId."); }}
   const wavelengthSalienceFunction = (wavelength: number) => salienceFunction(1 / wavelength);
   if (pitchFrequency == -1) {
      pitchFrequency = Math.round(PitchDetectionHarm.findPitchSalienceFunctionArgMax(salienceFunction, f0Min, f0Max)); }
   const pitchInfo = pitchFrequency + " Hz / " + (Math.round(1 / pitchFrequency * 1E5) / 1E2) + " ms";
   const harmonicAmplitudesOrUndef = AdaptiveStft.getHarmonicAmplitudes(parms.samples, centerPos * sampleRate, pitchFrequency / sampleRate, Math.floor(fCutoff / pitchFrequency));
   const harmonicAmplitudes = harmonicAmplitudesOrUndef ?? new Float64Array(0);
   const harmonicsViewerFunction = Utils.createHarmonicSpectrumViewerFunction(pitchFrequency, harmonicAmplitudes);
   const sinSynComponents = Utils.buildSinSynComponentsString(pitchFrequency, harmonicAmplitudes, -70);
   const sinSynUrl = sinSynUrlBase + encodeURIComponent(sinSynComponents);
   const xMax = (xAxisMode == "frequency") ? f0Max : viewportDuration;
   let pitchGraphFunction = (xAxisMode == "frequency") ? salienceFunction : wavelengthSalienceFunction;
   if (!buffered && DomUtils.getChecked("bufferedOutput")) {
      pitchGraphFunction = Utils.createArrayBackedFunction(pitchGraphFunction, 0, xMax, 1024, NaN); }
   if (yMax == -1) {
      yMax = salienceFunction(pitchFrequency) * 1.1; }
   const pitchViewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  pitchGraphFunction,
      xMin:            0,
      xMax:            xMax,
      yMin:            yMin,
      yMax:            yMax,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       (xAxisMode == "frequency") ? "Hz" : "s"};
   const harmonicsViewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  harmonicsViewerFunction,
      xMin:            0,
      xMax:            fCutoff,
      yMin:            -90,
      yMax:            0,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "Hz"};
   return {
      blocks: [
         { title:          `Pitch salience <span style="padding-left:35px">max=${pitchInfo}</span>`,
           cssClass:       "result250",
           viewerState:    pitchViewerState},
         { title:          `Harmonic spectrum of visible signal segment at ${pitchFrequency} Hz <a style="padding-left:35px" href="${sinSynUrl}">SinSyn</a>` ,
           cssClass:       "result250",
           viewerState:    harmonicsViewerState},
         ]}; }

// Old version, which has some unwanted behavior, but might be interesting for later improvement.
function calculatePitchByInstantaneousFrequencyIntegration (samples: Float64Array,  sampleRate: number, centerPos: number,
      f0Min: number, f0Max: number, fCutoff: number, maxFreqDev: number, frequencyResolution: number,
      shiftFactor: number, maxWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined,
      amplEvalParms: PitchDetectionHarm.HarmonicAmplitudeEvaluationParms) {
   const bufSize = Math.round(frequencyResolution / (fCutoff - f0Min) * (f0Max - f0Min));
   const buf = new Float64Array(bufSize);
   const bufIncr = (f0Max - f0Min) / (buf.length - 1);
   for (let i = 0; i < frequencyResolution; i++) {
      const measuringFrequency = f0Min + i * (fCutoff - f0Min) / frequencyResolution;
      const r = InstFreq.instFreqSingle_maxWindow(samples, centerPos * sampleRate, measuringFrequency / sampleRate, shiftFactor, maxWindowWidth * sampleRate, windowFunction);
      if (!r) {
         continue; }
      const amplitude = r.amplitude;
      const instFrequency = r.instFrequency * sampleRate;
      if (instFrequency < f0Min || instFrequency >= fCutoff) {
         continue; }
      const freqDev = (instFrequency > measuringFrequency ? instFrequency / measuringFrequency : measuringFrequency / instFrequency) - 1;
      if (freqDev > maxFreqDev) {
         continue; }
      let harmonic = Math.ceil(instFrequency / f0Max);
      while (true) {                                 // integrate down
         const f2 = instFrequency / harmonic;
         if (f2 < f0Min) {
            break; }
         const p = Math.round((f2 - f0Min) / bufIncr);
         if (p < 0 || p >= buf.length) {
            throw new Error(); }
         buf[p] += PitchDetectionHarm.evaluateHarmonicAmplitude(amplitude, harmonic, amplEvalParms);
         harmonic++; }}
   return {buf, bufIncr}; }
