// Analysis module for instantaneous frequency measured at a fixed point in time.

import {stripIndents as strip} from "common-tags";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions.js";
import * as InstFreq from "dsp-collection/signal/InstFreq.js";
import * as ArrayUtils from "dsp-collection/utils/ArrayUtils.js";
import * as DspUtils from "dsp-collection/utils/DspUtils.js";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as AnalysisBase from "./AnalysisBase.ts";
import * as Utils from "../Utils.ts";
import * as DomUtils from "../DomUtils.ts";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="iftVariant">Variant:</label>
    <select class="width3" id="iftVariant">
     <option value="instFreqSweep">Instantaneous frequency</option>
     <option value="instAmplLin">Linear peak shaping of instantaneous frequency amplitude</option>
     <option value="instAmplLog">Logarithmic peak shaping of instantaneous frequency amplitude</option>
     <option value="instAmplInt">Linear sum of instantaneous frequency amplitudes (normalized)</option>
     <option value="instAmplMax">Maximum of instantaneous frequency amplitudes</option>
    </select>
    <label class="width1 gap1" for="windowFunction" title="Window function">Window funct.:</label>
    <select class="width1" id="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("flatTop")}
    </select>
    <label class="width1 gap1" for="maxWindowWidth" title="Maximum window width in ms">Win. width [ms]:</label>
    <input class="width1" id="maxWindowWidth" type="number" step="any" required value="50">
   </div>
   <div class="parmLine">
    <label class="width1" for="minFrequency">Min. freq. [Hz]:</label>
    <input class="width1" id="minFrequency" type="number" step="any" required value="75">
    <label class="width1 gap1" id="maxFrequencyLabel" for="maxFrequency">Max. freq. [Hz]:</label>
    <input class="width1" id="maxFrequency" type="number" step="any" required value="5500">
    <label class="width1 gap1" for="shiftFactor" title="Shift factor, relative to the wavelength of the frequency. Used for measuring the phase delta.">Shift factor:</label>
    <input class="width1" id="shiftFactor" type="number" min="0" max="1" step="any" required value="0.25">
    <label class="width1 gap1" for="peakWidth" title="Width in Hz for the linear attenuation around each harmonic peak. Used to combine amplitude and frequency delta.">Peak width [Hz]:</label>
    <input class="width1" id="peakWidth" type="number" step="any" required value="100">
    <label class="width1 gap1" for="dbPerHz" title="dB per Hz to attenuate the amplitude around each harmonic peak. Used to combine amplitude and frequency delta.">dB per Hz:</label>
    <input class="width1" id="dbPerHz" type="number" step="any" required value="1">
    <label class="width1 gap1" for="segments" title="Number of segments for the discrete integration of the amplitudes of the instantaneous frequencies.">Segments:</label>
    <input class="width1" id="segments" type="number" required value="1000">
    <label class="width1 gap1" for="bufferedOutput">Buffered:</label>
    <input id="bufferedOutput" type="checkbox">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Instantaneous frequency at a fixed point in time",
   id:                  "InstFreqAtTime",
   f:                   main,
   formParmsHtml:       formParmsHtml,
   onFormParmsChange:   onFormParmsChange };

function onFormParmsChange() {
   const variantId = DomUtils.getValue("iftVariant");
   const showMinFrequency = variantId == "instAmplInt" || variantId == "instAmplMax";
   DomUtils.showElement("minFrequency",   showMinFrequency);
   DomUtils.setClass("maxFrequencyLabel", "gap1", showMinFrequency);
   DomUtils.showElement("peakWidth",      variantId == "instAmplLin");
   DomUtils.showElement("dbPerHz",        variantId == "instAmplLog");
   DomUtils.showElement("segments",       variantId == "instAmplInt" || variantId == "instAmplMax");
   DomUtils.showElement("bufferedOutput", variantId == "instFreqSweep"); }

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const sampleRate = parms.sampleRate;
   const centerPos = (parms.viewportXMax + parms.viewportXMin) / 2;
   const windowFunctionId = DomUtils.getValue("windowFunction");
   const maxWindowWidth   = DomUtils.getValueNum("maxWindowWidth") / 1000;
   const shiftFactor      = DomUtils.getValueNum("shiftFactor");
   const variantId        = DomUtils.getValue("iftVariant");
   const minFrequency     = DomUtils.getValueNum("minFrequency");
   const maxFrequency     = DomUtils.getValueNum("maxFrequency");
   const segments         = DomUtils.getValueNum("segments");
   const bufferedOutput   = DomUtils.getChecked("bufferedOutput");
   const windowFunction = (windowFunctionId == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionId, {tableCacheCostLimit: 1});
   let instFreqFunction = (measuringFrequency: number) => InstFreq.instFreqSingle_maxWindow(parms.samples, centerPos * sampleRate, measuringFrequency / sampleRate, shiftFactor, maxWindowWidth * sampleRate, windowFunction);
   switch (variantId) {

      case "instFreqSweep": {
         if (bufferedOutput) {
            instFreqFunction = Utils.createArrayBackedFunction(instFreqFunction, 0, maxFrequency, 2048, undefined); }
         const instFrequencyViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = instFreqFunction(time);
            if (!r) {
               return NaN; }
            switch (channel) {
               case 0: return r.instFrequency * sampleRate;
               case 1: return r.measuringFrequency * sampleRate;
               default: return NaN; }};
         const frequencyDeltaViewerFunction = (time: number) => {
            const r = instFreqFunction(time);
            return r ? (r.measuringFrequency - r.instFrequency) * sampleRate : NaN; };
         const amplitudeViewerFunction = (measuringFrequency: number) => {
            const r = instFreqFunction(measuringFrequency);
            return r ? DspUtils.convertAmplitudeToDb(r.amplitude) : NaN; };
         const instFrequencyViewerState: Partial<FunctionCurveViewer.ViewerState> = {
            viewerFunction:  instFrequencyViewerFunction,
            channels:        2,
            xMin:            0,
            xMax:            maxFrequency,
            yMin:            0,
            yMax:            maxFrequency,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "Hz",
            yAxisUnit:       "Hz" };
         const frequencyDeltaViewerState: Partial<FunctionCurveViewer.ViewerState> = {
            viewerFunction:  frequencyDeltaViewerFunction,
            xMin:            0,
            xMax:            maxFrequency,
            yMin:            -100,
            yMax:            100,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "Hz",
            yAxisUnit:       "Hz" };
         const amplitudeViewerState: Partial<FunctionCurveViewer.ViewerState> = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            0,
            xMax:            maxFrequency,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "Hz",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Instantaneous frequency (y-axis, green), measurement frequency (x-axis, blue)",
                 cssClass:       "result200",
                 viewerState:    instFrequencyViewerState,
                 syncXPosition:  true },
               { title:          "Frequency delta",
                 cssClass:       "result100",
                 viewerState:    frequencyDeltaViewerState,
                 syncXPosition:  true },
               { title:          "Amplitude (of measurement frequency)",
                 cssClass:       "result200",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      case "instAmplLin":
      case "instAmplLog": {
         const peakWidth = (variantId == "instAmplLin") ? DomUtils.getValueNum("peakWidth") : 0;
         const dbPerHz =   (variantId == "instAmplLog") ? DomUtils.getValueNum("dbPerHz")   : 0;
         const amplitudeViewerFunction = (measuringFrequency: number) => {
            const r = instFreqFunction(measuringFrequency);
            if (!r) {
               return NaN; }
            const absDelta = Math.abs(r.measuringFrequency - r.instFrequency) * sampleRate;
            let linAmplitude = r.amplitude;
            if (peakWidth) {
               linAmplitude *= Math.max(0, 1 - (2 * absDelta) / peakWidth); }
            let logAmplitude = DspUtils.convertAmplitudeToDb(linAmplitude);
            if (dbPerHz) {
               logAmplitude -= absDelta * dbPerHz; }
            return logAmplitude; };
         const amplitudeViewerState: Partial<FunctionCurveViewer.ViewerState> = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            0,
            xMax:            maxFrequency,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "Hz",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Amplitude of instantaneous frequency",
                 cssClass:       "result250",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      case "instAmplInt":
      case "instAmplMax": {
         const buf = new Float64Array(segments);
         const bufIncrement = (maxFrequency - minFrequency) / segments;
         const intOrMax = variantId == "instAmplInt";
         for (let i = 0; i < segments; i++) {
            const f = minFrequency + i * bufIncrement;
            const r = instFreqFunction(f);
            if (!r) {
               continue; }
            const p = Math.round((r.instFrequency * sampleRate - minFrequency) / bufIncrement);
            if (p >= 0 && p < segments) {
               if (intOrMax) {
                  buf[p] += r.amplitude; }                           // linear integration
                else {
                  buf[p] = Math.max(buf[p], r.amplitude); }}}        // maximum
         const maxVal = ArrayUtils.max(buf);
         const amplitudeViewerFunction = (frequency: number) => {
            const p = Math.round((frequency - minFrequency) / bufIncrement);
            if (p < 0 || p >= segments) {
               return NaN; }
            let amplitude = buf[p];
            if (intOrMax) {
               amplitude /= maxVal * 2; }                            // normalize
            return DspUtils.convertAmplitudeToDb(amplitude); };
         const amplitudeViewerState: Partial<FunctionCurveViewer.ViewerState> = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            0,
            xMax:            maxFrequency,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "Hz",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Amplitude of instantaneous frequency",
                 cssClass:       "result250",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      default: {
         throw new Error("Unknown variantId."); }}}
