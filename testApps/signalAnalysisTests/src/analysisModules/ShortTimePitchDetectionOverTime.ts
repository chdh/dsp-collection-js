// Analysis module for short time pitch detection measured over time.

import {stripIndents as strip} from "common-tags";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as PitchDetectionHarm from "dsp-collection/signal/PitchDetectionHarm";
import * as AnalysisBase from "./AnalysisBase";
import * as Utils from "../Utils";
import * as DomUtils from "../DomUtils";
import * as BackgroundTaskMgr from "../BackgroundTaskMgr";
import * as FunctionCurveViewer from "function-curve-viewer";

const defaultHarmSumParms = PitchDetectionHarm.getDefaultHarmonicInstSumParms();

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="pdVariant">Variant:</label>
    <select id="pdVariant" class="width3">
     <option value="harmSumRel">Harmonic sum</option>
     <option value="harmSumInst">Harmonic sum with instantaneous frequency peak shaping</option>
    </select>
    <label class="width1 gap1" for="windowFunction">Window:</label>
    <select class="width1" id="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("hann")}
    </select>
    <label class="width1 gap1" for="relWindowWidth" title="Window width relative to F0 wavelength.">Relative window:</label>
    <input class="width1" id="relWindowWidth" type="number" min="1" required value="${defaultHarmSumParms.relWindowWidth}">
   </div>
   <div class="parmLine">
    <label class="width1" for="stepSize" title="Step size in ms for performung a pitch detection.">Step size [ms]:</label>
    <input class="width1" id="stepSize" type="number" step="any" required value="50">
    <label class="width1 gap1" for="f0Min">F0 min. [Hz]:</label>
    <input class="width1" id="f0Min" type="number" step="any" min="1" required value="75">
    <label class="width1 gap1" for="f0Max">F0 max. [Hz]:</label>
    <input class="width1" id="f0Max" type="number" step="any" required value="900">
    <label class="width1 gap1" for="fCutoff" title="Cutoff frequency in Hz. Specifies a hard upper frequency limit up to which the harmonic amplitudes are evaluated.">Cutoff freq. [Hz]:</label>
    <input class="width1" id="fCutoff" type="number" step="any" required value="${defaultHarmSumParms.fCutoff}">
   </div>
   <div class="parmLine">
    <label class="width1" for="amplitudeCompressionExponent" title="Amplitude compression exponent">Amplitude exp.:</label>
    <input class="width1" id="amplitudeCompressionExponent" type="number" step="any" required value="${defaultHarmSumParms.amplitudeCompressionExponent}">
    <label class="width1 gap1" for="harmonicsDeclineRate" title="Decline rate for harmonics integration. Initial negative slope of the decline curve.">Decline rate:</label>
    <input class="width1" id="harmonicsDeclineRate" type="number" step="any" required value="${defaultHarmSumParms.harmonicsDeclineRate}">
    <label class="width1 gap1" for="harmonicsDeclineExponent" title="Hyperbolic decline exponent constant for harmonics integration. 1 for harmonic decline. -1 for linear decline (with clipping to 0). 0 for exponential decline. Between 0 and 1 for hyperbolic decline.">Decline exp.:</label>
    <input class="width1" id="harmonicsDeclineExponent" type="number" step="any" required value="${defaultHarmSumParms.harmonicsDeclineExponent}">
   </div>
   <div class="parmLine" id="instParms">
    <label class="width1" for="shiftFactor" title="Shift factor, relative to the wavelength of the frequency. Used for measuring the phase delta.">Shift factor:</label>
    <input class="width1" id="shiftFactor" type="number" min="0" max="1" step="any" required value="${defaultHarmSumParms.shiftFactor}">
    <label class="width1 gap1" for="peakWidthFactor" title="Relative peak width factor, used for peak shaping of instantaneous amplitudes. Specifies the peak width relative to F0.">Peak width:</label>
    <input class="width1" id="peakWidthFactor" type="number" step="any" required value="${defaultHarmSumParms.peakWidthFactor}">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Short-time pitch detection over time",
   id:                  "PitchDetectionHarmOverTime",
   f:                   main,
   formParmsHtml:       formParmsHtml,
   onFormParmsChange:   onFormParmsChange,
   wideRange:           true };

function onFormParmsChange() {
   const variantId = (<HTMLSelectElement>document.getElementById("pdVariant")!).value;
   DomUtils.showElement("instParms", variantId == "harmSumInst"); }

async function main (parms: AnalysisBase.AnalysisParms) : Promise<AnalysisBase.AnalysisResult> {
   const variantId = (<HTMLSelectElement>document.getElementById("pdVariant")!).value;
   const windowFunctionId = DomUtils.getValue("windowFunction");
   const stepSize         = DomUtils.getValueNum("stepSize") / 1000;
   const f0Min            = DomUtils.getValueNum("f0Min");
   const f0Max            = DomUtils.getValueNum("f0Max");
   const harmSumParms: PitchDetectionHarm.HarmonicInstSumParms = {
      amplitudeCompressionExponent: DomUtils.getValueNum("amplitudeCompressionExponent"),
      harmonicsDeclineRate:         DomUtils.getValueNum("harmonicsDeclineRate"),
      harmonicsDeclineExponent:     DomUtils.getValueNum("harmonicsDeclineExponent"),
      fCutoff:                      DomUtils.getValueNum("fCutoff"),
      relWindowWidth:               DomUtils.getValueNum("relWindowWidth"),
      windowFunction:               undefined,             // undefined here, because it cannot be sent to the web worker thread
      shiftFactor:                  DomUtils.getValueNum("shiftFactor"),
      peakWidthFactor:              DomUtils.getValueNum("peakWidthFactor") };
   const buf = await BackgroundTaskMgr.execTask("scanPitch", [parms.samples, parms.sampleRate, parms.viewportXMin, parms.viewportXMax, stepSize, f0Min, f0Max, harmSumParms, windowFunctionId, variantId]);
   const pitchFunction = (time: number) => buf[Math.round((time - parms.viewportXMin) / stepSize)];
   const pitchViewerState: FunctionCurveViewer.ViewerState = {
      viewerFunction:  pitchFunction,
      xMin:            parms.viewportXMin,
      xMax:            parms.viewportXMax,
      yMin:            0,
      yMax:            f0Max,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s",
      yAxisUnit:       "Hz"};
   return {
      blocks: [
         { title:          "Pitch",
           cssClass:       "result250",
           viewerState:    pitchViewerState},
         ]}; }

function scanPitch (samples: Float64Array, sampleRate: number, startPos: number, endPos: number, stepSize: number, f0Min: number, f0Max: number, parms0: PitchDetectionHarm.HarmonicInstSumParms, windowFunctionId: string, variantId: string) : Float64Array {
   const windowFunction = (windowFunctionId == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionId, {tableCacheCostLimit: 1});
   const parms = {...parms0, windowFunction};
   const n = Math.round((endPos - startPos) / stepSize) + 1;
   const buf = new Float64Array(n);
   for (let i = 0; i < n; i++) {
      const position = startPos + i * stepSize;
      let salienceFunction: (frequency: number) => number;
      switch (variantId) {
         case "harmSumRel": {
            salienceFunction = (f0: number) => PitchDetectionHarm.harmonicSum(samples, sampleRate, position, f0, parms);
            break; }
         case "harmSumInst": {
            salienceFunction = (f0: number) => PitchDetectionHarm.harmonicInstSum(samples, sampleRate, position, f0, parms);
            break; }
         default: {
            throw new Error("Unknown pitch detection variant."); }}
      buf[i] = PitchDetectionHarm.findPitchSalienceFunctionArgMax(salienceFunction, f0Min, f0Max, {relTolerance: 1E-2,  absTolerance: 0.5}); }
   return buf; }

BackgroundTaskMgr.registerTaskFunction("scanPitch", scanPitch);
