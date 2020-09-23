// Analysis module for instantaneous frequency measured over time.

import {stripIndents as strip} from "common-tags";
import Complex from "dsp-collection/math/Complex";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as AdaptiveStft from "dsp-collection/signal/AdaptiveStft";
import * as InstFreq from "dsp-collection/signal/InstFreq";
import * as DspUtils from "dsp-collection/utils/DspUtils";
import * as PitchDetectionHarm from "dsp-collection/signal/PitchDetectionHarm";
import * as EnvelopeDetection from "dsp-collection/signal/EnvelopeDetection";
import * as ArrayUtils from "dsp-collection/utils/ArrayUtils";
import * as MathUtils from "dsp-collection/math/MathUtils";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as AnalysisBase from "./AnalysisBase";
import * as Utils from "../Utils";
import * as DomUtils from "../DomUtils";

const defaultFrequency = 250;
const eol = "\r\n";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="iftVariant">Variant:</label>
    <select id="iftVariant" class="width3">
     <option value="singleFreqTracking">Single frequency tracking</option>
     <option value="multiFreqTracking">Uncoupled multi-frequency tracking</option>
     <option value="harmTracking">Harmonic frequency tracking</option>
     <option value="fixedFreq">Instantaneous frequency of a fixed measuring frequency</option>
     <option value="fixedFreqPhase">Instantaneous phase of a fixed frequency</option>
    </select>
    <label class="width1 gap1" for="windowFunction" title="Window function">Window funct.:</label>
    <select class="width1" id="windowFunction">
     ${Utils.genWindowFunctionOptionsHtml("flatTop")}
    </select>
    <label class="width1 gap1" for="maxWindowWidth" title="Maximum window width in ms">Win. width [ms]:</label>
    <input class="width1" id="maxWindowWidth" type="number" step="any" required value="50">
    <label class="width1 gap1" for="relWindowWidth" title="Window width relative to F0 wavelength (for multi-frequency tracking) or tracking frequency (for single frequency tracking).">Relative window:</label>
    <input class="width1" id="relWindowWidth" type="number" min="1" required value="12">
   </div>
   <div class="parmLine">
    <label class="width1" for="measuringFrequency" title="Measuring frequency in Hz">Measuring f. [Hz]:</label>
    <input class="width1" id="measuringFrequency" type="number" step="any" required value="${defaultFrequency}">
    <label class="width1" for="startFrequency" title="Start frequency in Hz">Start freq. [Hz]:</label>
    <input class="width1" id="startFrequency" type="number" step="any" placeholder="(auto)">
    <label class="width1 gap1" for="shiftFactor" title="Shift factor, relative to the wavelength of the frequency. Used for measuring the phase delta.">Shift factor:</label>
    <input class="width1" id="shiftFactor" type="number" min="0" max="1" step="any" required value="0.25">
    <label class="width1 gap1" for="trackingInterval" title="Tracking interval in ms">Interval [ms]:</label>
    <input class="width1" id="trackingInterval" type="number" step="any" value="1" required>
    <label class="width1 gap1" for="maxFrequencyDerivative" title="Maximum relative frequency derivative per second">Max. derivative:</label>
    <input class="width1" id="maxFrequencyDerivative" type="number" step="any" required value="4">
   </div>
   <div class="parmLine" id="parmLine3">
    <label class="width1" for="minTrackingAmplitudeDb" title="Minimum tracking amplitude in dB. Harmonics with a lower amplitude are ignored.">Min. ampl. [dB]:</label>
    <input class="width1" id="minTrackingAmplitudeDb" type="number" step="any" value="-55" required>
    <label class="width1 gap1" for="harmonics" title="Number of harmonic frequencies to track">Harmonics:</label>
    <input class="width1" id="harmonics" type="number" min="1" value="10" required>
    <label class="width1 gap1" for="fCutoff" title="Upper frequency limit for the harmonics">Cutoff freq. [Hz]:</label>
    <input class="width1" id="fCutoff" type="number" min="1" step="any" value="5500" required>
    <label class="width1 gap1" for="exportFlag" title="Export result to text file">Export:</label>
    <input id="exportFlag" type="checkbox">
   </div>
   <div class="parmLineHeading" id="parmLineExportHeading">
    <div>Export parameters</div>
   </div>
   <div class="parmLine" id="parmLineExport">
    <label class="width1" for="exportInterval" title="Export interval as a multiple of the tracking interval">Export interval:</label>
    <input class="width1" id="exportInterval" type="number" min="1" value="5" required>
    <label class="width1 gap1" for="minExportAmplitudeDb" title="Minimum harmonic amplitude for export in dB">Min. ampl. [dB]:</label>
    <input class="width1" id="minExportAmplitudeDb" type="number" step="any" value="-55" required>
    <label class="width1 gap1" for="windowFunctionExport" title="Window function for computing harmonic amplitudes for export">Window funct.:</label>
    <select class="width1" id="windowFunctionExport">
     ${Utils.genWindowFunctionOptionsHtml("flatTop")}
    </select>
    <label class="width1 gap1" for="relWindowWidthExport" title="Window width relative to F0 wavelength for computing harmonic amplitudes for export">Relative window:</label>
    <input class="width1" id="relWindowWidthExport" type="number" min="1" required value="12">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Instantaneous frequency over time",
   id:                  "InstFreqOverTime",
   f:                   main,
   formParmsHtml:       formParmsHtml,
   onFormParmsChange:   onFormParmsChange,
   wideRange:           true };
function onFormParmsChange() {
   const variantId = DomUtils.getValue("iftVariant");
   const tracking = variantId == "singleFreqTracking" || variantId == "multiFreqTracking" || variantId == "harmTracking";
   const exportMode = variantId == "harmTracking" && DomUtils.getChecked("exportFlag");
   DomUtils.showElement("maxWindowWidth",         !tracking);
   DomUtils.showElement("relWindowWidth",         tracking);
   DomUtils.showElement("shiftFactor",            variantId != "fixedFreqPhase");
   DomUtils.showElement("measuringFrequency",     !tracking);
   DomUtils.showElement("startFrequency",         tracking);
   DomUtils.showElement("trackingInterval",       tracking);
   DomUtils.showElement("maxFrequencyDerivative", tracking);
   DomUtils.showElement("parmLine3",              tracking);
   DomUtils.showElement("harmonics",              variantId == "multiFreqTracking" || variantId == "harmTracking");
   DomUtils.showElement("fCutoff",                variantId == "harmTracking");
   DomUtils.showElement("exportFlag",             variantId == "harmTracking");
   DomUtils.showElement("parmLineExportHeading",  exportMode);
   DomUtils.showElement("parmLineExport",         exportMode); }

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const sampleRate = parms.sampleRate;
   const xMin = parms.viewportXMin;
   const xMax = parms.viewportXMax;
   const windowFunctionId        = DomUtils.getValue("windowFunction");
   const maxWindowWidth          = DomUtils.getValueNum("maxWindowWidth") / 1000;
   const relWindowWidth          = DomUtils.getValueNum("relWindowWidth");
   const fixedMeasuringFrequency = DomUtils.getValueNum("measuringFrequency");
   const startFrequencySpec      = DomUtils.getValueNum("startFrequency");
   const trackingInterval        = DomUtils.getValueNum("trackingInterval") / 1000;
   const minExportAmplitudeDb    = DomUtils.getValueNum("minExportAmplitudeDb");
   const exportInterval          = DomUtils.getValueNum("exportInterval");
   const exportFlag              = DomUtils.getChecked("exportFlag");
   const relWindowWidthExport    = DomUtils.getValueNum("relWindowWidthExport");
   const windowFunctionIdExport  = DomUtils.getValue("windowFunctionExport");
   const maxFrequencyDerivative  = DomUtils.getValueNum("maxFrequencyDerivative");
   const minTrackingAmplitudeDb  = DomUtils.getValueNum("minTrackingAmplitudeDb");
   const harmonics               = DomUtils.getValueNum("harmonics");
   const fCutoff                 = DomUtils.getValueNum("fCutoff");
   const shiftFactor             = DomUtils.getValueNum("shiftFactor");
   const variantId               = DomUtils.getValue("iftVariant");
   const minTrackingAmplitude = DspUtils.convertDbToAmplitude(minTrackingAmplitudeDb);
   const windowFunction = (windowFunctionId == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionId, {tableCacheCostLimit: 1});
   switch (variantId) {

      case "fixedFreq": {
         const instFreqFunction = (time: number) => InstFreq.instFreqSingle_maxWindow(parms.samples, time * sampleRate, fixedMeasuringFrequency / sampleRate, shiftFactor, maxWindowWidth * sampleRate, windowFunction);
         const bufferedInstFreqFunction = Utils.createArrayBackedFunction(instFreqFunction, xMin, xMax, 1024, undefined);
         const instFrequencyViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = bufferedInstFreqFunction(time);
            if (!r) {
               return NaN; }
            switch (channel) {
               case 0: return r.instFrequency * sampleRate;
               case 1: return r.measuringFrequency * sampleRate;
               default: return NaN; }};
         const amplitudeViewerFunction = (time: number) => {
            const r = bufferedInstFreqFunction(time);
            return r ? DspUtils.convertAmplitudeToDb(r.amplitude) : NaN; };
         const instFrequencyViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  instFrequencyViewerFunction,
            channels:        2,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            fixedMeasuringFrequency * 0.9,
            yMax:            fixedMeasuringFrequency * 1.1,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "Hz" };
         const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Instantaneous frequency",
                 cssClass:       "result200",
                 viewerState:    instFrequencyViewerState,
                 syncXPosition:  true },
               { title:          "Amplitude",
                 cssClass:       "result200",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      case "fixedFreqPhase": {
         const waveComponentFunction = (time: number) => {
            const r = AdaptiveStft.getSingle_maxWindow(parms.samples, fixedMeasuringFrequency / sampleRate, time * sampleRate, maxWindowWidth * sampleRate, windowFunction);
            return r ? r.component : Complex.NaN; };
         const amplitudeViewerFunction = (time: number) => DspUtils.convertAmplitudeToDb(waveComponentFunction(time).abs());
         const phaseViewerFunction = (time: number) => waveComponentFunction(time).arg();
         const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         const phaseYRange = 1.05 * Math.PI;
         const phaseViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  phaseViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -phaseYRange,
            yMax:            phaseYRange,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s" };
         return {
            blocks: [
               { title:          "Amplitude",
                 cssClass:       "result200",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               { title:          "Phase",
                 cssClass:       "result100",
                 viewerState:    phaseViewerState,
                 syncXPosition:  true },
               ]}; }

      case "singleFreqTracking": {
         const startFrequency = startFrequencySpec || findTrackingStartFrequency(parms.samples, sampleRate, xMin, xMax) || defaultFrequency;
         const trackingPositions = Math.floor((xMax - xMin) / trackingInterval) + 1;
         const buf = trackFrequency(parms.samples, xMin * sampleRate, trackingInterval * sampleRate, trackingPositions, startFrequency / sampleRate, maxFrequencyDerivative / sampleRate, minTrackingAmplitude, shiftFactor, 0, relWindowWidth, windowFunction);
         let minFrequency = +Infinity;
         let maxFrequency = 0;
         let minAmplitude = +Infinity;
         let maxAmplitude = -Infinity;
         for (const r of buf) {
            if (r) {
               const frequency = r.frequency * sampleRate;
               const amplitude = DspUtils.convertAmplitudeToDb(r.amplitude);
               minFrequency = Math.min(minFrequency, frequency);
               maxFrequency = Math.max(maxFrequency, frequency);
               minAmplitude = Math.min(minAmplitude, amplitude);
               maxAmplitude = Math.max(maxAmplitude, amplitude); }}
         const frequencyRange = Math.max(0, maxFrequency - minFrequency);
         const amplitudeRange = Math.max(0, maxAmplitude - minAmplitude);
         function getBufEntry (time: number) {
            const p = Math.round((time - xMin) / trackingInterval);
            return (p >= 0 && p < trackingPositions) ? buf[p] : undefined; }
         const instFrequencyViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = getBufEntry(time);
            if (!r) {
               return NaN; }
            switch (channel) {
               case 0: return r.frequency * sampleRate;
               case 1: return r.instFrequency * sampleRate;
               default: return NaN; }};
         const amplitudeViewerFunction = (time: number) => {
            const r = getBufEntry(time);
            return r ? DspUtils.convertAmplitudeToDb(r.amplitude) : NaN; };
         const instFrequencyViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  instFrequencyViewerFunction,
            channels:        2,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            Math.min(startFrequency, Math.max(0, minFrequency - frequencyRange / 10)),
            yMax:            Math.max(startFrequency, Math.min(startFrequency * 2, maxFrequency + frequencyRange / 10)),
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "Hz" };
         const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  amplitudeViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            Math.max(-90, Math.min(0, minAmplitude - amplitudeRange / 10)),
            yMax:            Math.max(-90, Math.min(0, maxAmplitude + amplitudeRange / 10)),
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Tracker frequency (green) / instantaneous frequency (blue)",
                 cssClass:       "result200",
                 viewerState:    instFrequencyViewerState,
                 syncXPosition:  true },
               { title:          "Amplitude",
                 cssClass:       "result200",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      case "multiFreqTracking": {
         const startFrequency = startFrequencySpec || findTrackingStartFrequency(parms.samples, sampleRate, xMin, xMax) || defaultFrequency;
         const trackingPositions = Math.floor((xMax - xMin) / trackingInterval) + 1;
         const bufs: SingleTrackingInfo[][] = Array(harmonics);
         for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
            const harmonicStartFrequency = startFrequency * harmonic;
            bufs[harmonic - 1] = trackFrequency(parms.samples, xMin * sampleRate, trackingInterval * sampleRate, trackingPositions, harmonicStartFrequency / sampleRate, maxFrequencyDerivative / sampleRate, minTrackingAmplitude, shiftFactor, 0, relWindowWidth * harmonic, windowFunction); }
         function getBufEntry (channel: number, time: number) {
            const p = Math.round((time - xMin) / trackingInterval);
            return (p >= 0 && p < trackingPositions) ? bufs[channel][p] : undefined; }
         const frequenciesViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = getBufEntry(channel, time);
            return r ? r.frequency * sampleRate : NaN; };
         const amplitudeViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = getBufEntry(channel, time);
            return r ? DspUtils.convertAmplitudeToDb(r.amplitude) : NaN; };
         const overallAmplitudes = new Float64Array(trackingPositions);
         for (let i = 0; i < trackingPositions; i++) {
            let sum = 0;
            for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
               const r = bufs[harmonic - 1][i];
               if (r) {
                  sum += r.amplitude; }}
            overallAmplitudes[i] = DspUtils.convertAmplitudeToDb(sum); }
         const overallAmplitudeViewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(overallAmplitudes, 1 / trackingInterval, -xMin / trackingInterval);
         const frequenciesViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  frequenciesViewerFunction,
            channels:        harmonics,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            0,
            yMax:            startFrequency * harmonics * 1.1,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "Hz" };
         const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  amplitudeViewerFunction,
            channels:        harmonics,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         const overallAmplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  overallAmplitudeViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -90,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Harmonic frequencies",
                 cssClass:       "result300",
                 viewerState:    frequenciesViewerState,
                 syncXPosition:  true },
               { title:          "Harmonic amplitudes",
                 cssClass:       "result300",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               { title:          "Overall harmonic amplitude",
                 cssClass:       "result300",
                 viewerState:    overallAmplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      case "harmTracking": {
         const startFrequency = startFrequencySpec || findTrackingStartFrequency(parms.samples, sampleRate, xMin, xMax) || defaultFrequency;
         const trackingPositions = Math.floor((xMax - xMin) / trackingInterval) + 1;
         const buf = trackHarmonics(parms.samples, xMin * sampleRate, trackingInterval * sampleRate, trackingPositions, startFrequency / sampleRate, maxFrequencyDerivative / sampleRate, minTrackingAmplitude, harmonics, fCutoff / sampleRate, shiftFactor, relWindowWidth, windowFunction);
         if (exportFlag) {
            const windowFunctionExport = (windowFunctionIdExport == "rect") ? undefined : WindowFunctions.getFunctionbyId(windowFunctionIdExport, {tableCacheCostLimit: 1});
            const harmSynRecords = genHarmSynRecords(parms.samples, buf, xMin * sampleRate, trackingInterval * sampleRate, exportInterval, fCutoff / sampleRate, relWindowWidthExport, windowFunctionExport);
            const header = "; Signal filename: " + parms.fileName + eol;
            const textFile = header + createHarmSynFile(harmSynRecords, trackingInterval * exportInterval, minExportAmplitudeDb, sampleRate);
            const blob = new Blob([textFile], {type: "text/plain"});
            Utils.openSaveAsDialog(blob, Utils.removeFileNameExtension(parms.fileName) + "-HarmSyn.txt"); }
         function getBufEntry (time: number) {
            const p = Math.round((time - xMin) / trackingInterval);
            return (p >= 0 && p < trackingPositions) ? buf[p] : undefined; }
         const f0ViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = getBufEntry(time);
            if (!r) {
               return NaN; }
            switch (channel) {
               case 0: return r.f0 * sampleRate;
               case 1: return r.instF0 * sampleRate;
               default: return NaN; }};
         const amplitudeViewerFunction = (time: number, _sampleWidth: number, channel: number) => {
            const r = getBufEntry(time);
            return r ? DspUtils.convertAmplitudeToDb(r.amplitudes[channel]) : NaN; };
         const amplitudeOverFrequencyPaintFunction = (pctx: FunctionCurveViewer.CustomPaintContext) => {
            const ctx = pctx.ctx;
            ctx.save();
            for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
               ctx.strokeStyle = pctx.curveColors[harmonic - 1] || "#666666";
               // ctx.globalCompositeOperation = "multiply";
               ctx.beginPath();
               for (let p = 0; p < trackingPositions; p++) {
                  const r = buf[p];
                  const frequency = r.f0 * harmonic * sampleRate;
                  const amplitude = r.amplitudes[harmonic - 1];
                  if (isNaN(amplitude)) {
                     ctx.stroke();
                     ctx.beginPath();
                     continue; }
                  const amplitudeDb = DspUtils.convertAmplitudeToDb(amplitude);
                  ctx.lineTo(pctx.mapLogicalToCanvasXCoordinate(frequency), pctx.mapLogicalToCanvasYCoordinate(amplitudeDb)); }
               ctx.stroke(); }
            ctx.restore(); };
         const overallAmplitudeViewerFunction = (time: number) => {
            const r = getBufEntry(time);
            return r ? DspUtils.convertAmplitudeToDb(r.overallAmplitude) : NaN; };
         const f0ViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  f0ViewerFunction,
            channels:        2,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            0,
            yMax:            startFrequency * 2,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "Hz" };
         const amplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  amplitudeViewerFunction,
            channels:        harmonics,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -80,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         const amplitudeOverFrequencyViewerState: FunctionCurveViewer.ViewerState = {
            xMin:            0,
            xMax:            startFrequency * harmonics * 1.1,
            yMin:            -80,
            yMax:            0,
            xAxisUnit:       "Hz",
            yAxisUnit:       "dB",
            customPaintFunction: amplitudeOverFrequencyPaintFunction };
         const overallAmplitudeViewerState: FunctionCurveViewer.ViewerState = {
            viewerFunction:  overallAmplitudeViewerFunction,
            xMin:            xMin,
            xMax:            xMax,
            yMin:            -80,
            yMax:            0,
            primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
            xAxisUnit:       "s",
            yAxisUnit:       "dB" };
         return {
            blocks: [
               { title:          "Fundamental frequency (green = tracked, blue = instantaneous)",
                 cssClass:       "result200",
                 viewerState:    f0ViewerState,
                 syncXPosition:  true },
               { title:          "Harmonic amplitudes over frequency",
                 cssClass:       "result300",
                 viewerState:    amplitudeOverFrequencyViewerState },
               { title:          "Harmonic amplitudes over time",
                 cssClass:       "result300",
                 viewerState:    amplitudeViewerState,
                 syncXPosition:  true },
               { title:          "Overall harmonic amplitude",
                 cssClass:       "result300",
                 viewerState:    overallAmplitudeViewerState,
                 syncXPosition:  true },
               ]}; }

      default: {
         throw new Error("Unknown variantId."); }}}

interface SingleTrackingInfo {                             // tracking info for a specific time position
   frequency:                number;                       // tracked frequency (normalized)
   instFrequency:            number;                       // instantaneous frequency (normalized)
   amplitude:                number; }                     // amplitude of the frequency component

// The window width can be specified as maxWindowWidth or relWindowWidth.
function trackFrequency (samples: Float64Array, startPosition: number, trackingInterval: number, trackingPositions: number,
      startFrequency: number, maxFrequencyDerivative: number, minAmplitude: number,
      shiftFactor: number, maxWindowWidth: number, relWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : SingleTrackingInfo[] {
   const buf: SingleTrackingInfo[] = new Array(trackingPositions);
   let currentFrequency = startFrequency;
   for (let p = 0; p < trackingPositions; p++) {
      const position = startPosition + p * trackingInterval;
      const currentRelWindowWidth = relWindowWidth || Math.floor(maxWindowWidth * currentFrequency);
      const r = InstFreq.instFreqSingle_relWindow(samples, position, currentFrequency, shiftFactor, currentRelWindowWidth, windowFunction);
      if (!r || r.amplitude < minAmplitude) {
         continue; }
      const diff = r.instFrequency - currentFrequency;
      const maxDiff = maxFrequencyDerivative * trackingInterval * currentFrequency;
      const corr = Math.max(-maxDiff, Math.min(maxDiff, diff));
      currentFrequency += corr;
      buf[p] = {frequency: currentFrequency, instFrequency: r.instFrequency, amplitude: r.amplitude}; }
   return buf; }

interface HarmonicTrackingInfo {                           // harmonic tracking info for a specific time position
   f0:                       number;                       // fundamental frequency (normalized)
   instF0:                   number;                       // instantaneous fundamental frequency (normalized)
   amplitudes:               Float64Array;                 // amplitudes of the harmonic frequency components
   overallAmplitude:         number; }                     // sum of the amplitudes of the harmonics

function trackHarmonics (samples: Float64Array, startPosition: number, trackingInterval: number, trackingPositions: number,
      f0Start: number, maxFrequencyDerivative: number, minAmplitude: number, harmonics: number, fCutoff: number,
      shiftFactor: number, relWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : HarmonicTrackingInfo[] {
   const buf: HarmonicTrackingInfo[] = new Array(trackingPositions);
   let f0Current = f0Start;
   for (let p = 0; p < trackingPositions; p++) {
      const position = startPosition + p * trackingInterval;
      const maxDiff = maxFrequencyDerivative * trackingInterval * f0Current;
      const tInfo = <HarmonicTrackingInfo>{};
      tInfo.amplitudes = new Float64Array(harmonics);
      tInfo.amplitudes.fill(NaN);
      let amplitudeSum = 0;
      let weightedInstF0Sum = 0;
      let weightedCorrSum = 0;
      for (let harmonic = 1; harmonic <= harmonics; harmonic++) {
         const harmonicFrequency = f0Current * harmonic;
         if (harmonicFrequency >= fCutoff) {
            continue; }
         const r = InstFreq.instFreqSingle_relWindow(samples, position, harmonicFrequency, shiftFactor, relWindowWidth * harmonic, windowFunction);
         if (!r) {
            continue; }
         tInfo.amplitudes[harmonic - 1] = r.amplitude;
         if (r.amplitude < minAmplitude) {
            continue; }
         const diff = (r.instFrequency - harmonicFrequency) / harmonic;
         const corr = Math.max(-maxDiff, Math.min(maxDiff, diff));
         amplitudeSum += r.amplitude;
         weightedInstF0Sum += r.instFrequency / harmonic * r.amplitude;
         weightedCorrSum += corr * r.amplitude; }
      const corrSum = amplitudeSum ? weightedCorrSum / amplitudeSum : 0;
      f0Current += corrSum;
      tInfo.f0 = f0Current;
      tInfo.instF0 = amplitudeSum ? weightedInstF0Sum / amplitudeSum : NaN;
      tInfo.overallAmplitude = amplitudeSum ? amplitudeSum : NaN;
      buf[p] = tInfo; }
   return buf; }

function findTrackingStartFrequency (samples: Float64Array, sampleRate: number, segmentStart: number, segmentEnd: number) : number {
   const f0Min = 75;
   const f0Max = 900;
   const minPitchAmplitudeDb = -30;
   const minPitchAmplitude = DspUtils.convertDbToAmplitude(minPitchAmplitudeDb);
   const pitchParms = PitchDetectionHarm.getDefaultHarmonicSumParms();
   const pitchWindowWidth = (pitchParms.relWindowWidth + 0.1) / f0Min;
   const envStartPos = findEnvelopeStart(samples, sampleRate, segmentStart - pitchWindowWidth / 2, segmentEnd - pitchWindowWidth / 2, minPitchAmplitude);
   if (isNaN(envStartPos)) {
      return NaN; }
   const pitchPos = envStartPos + pitchWindowWidth / 2;
   return PitchDetectionHarm.estimatePitch_harmonicSum(samples, sampleRate, pitchPos, f0Min, f0Max); }

function findEnvelopeStart (samples: Float64Array, sampleRate: number, segmentStart: number, segmentEnd: number, minAmplitude: number) : number {
   const windowWidthDc = 0.200;
   const windowWidthEnvelope = 0.050;
   const envelope = EnvelopeDetection.generateSignalEnvelope(samples, Math.round(windowWidthDc * sampleRate), Math.round(windowWidthEnvelope * sampleRate));
      // It's not optimal to calculate the envelope over the whole signal, but the algorithm is fast.
   const segStartPos = Math.max(0, Math.ceil(segmentStart * sampleRate));
   const segEndPos = Math.min(samples.length * sampleRate, Math.floor(segmentEnd * sampleRate));
   const envelopeSeg = envelope.subarray(segStartPos, segEndPos);
   return (segStartPos + ArrayUtils.argGte(envelopeSeg, minAmplitude)) / sampleRate; }

interface HarmSynRecord {                                  // record for harmonic synthesizer
   f0:                       number;                       // fundamental frequency (normalized)
   amplitudes:               Float64Array; }               // amplitudes of the harmonic frequency components

function genHarmSynRecords (samples: Float64Array, trackingInfos: HarmonicTrackingInfo[], startPosition: number, trackingInterval: number,
      exportInterval: number, fCutoff: number, relWindowWidth: number, windowFunction: WindowFunctions.WindowFunction | undefined) : HarmSynRecord[] {
   const n = Math.floor(trackingInfos.length / exportInterval);
   const buf: HarmSynRecord[] = new Array(n);
   for (let p = 0; p < n; p++) {
      const position = startPosition + p * exportInterval * trackingInterval;
      const tInfo = trackingInfos[p * exportInterval];
      if (isNaN(tInfo.f0) || !tInfo.overallAmplitude) {
         continue; }
      const f0 = tInfo.f0;                                 // only f0 is used from the trackingInfos array
      const harmonics = Math.floor(fCutoff / f0);
      const amplitudes = AdaptiveStft.getHarmonicAmplitudes(samples, position, f0, harmonics, relWindowWidth, windowFunction);
      if (!amplitudes) {
         continue; }
      buf[p] = {f0, amplitudes}; }
   return buf; }

function createHarmSynFile (harmSynRecords: HarmSynRecord[], interval: number, minAmplitudeDb: number, sampleRate: number) : string {
   let out = "";
   const timeDigits = (interval >= 0.001 && MathUtils.isFuzzyInteger(interval * 1000, 1E-10)) ? 3 : 6;
   for (let p = 0; p < harmSynRecords.length; p++) {
      const relTime = p * interval;
      const r = harmSynRecords[p];
      if (!r) {
         continue; }
      const f0 = Math.round(r.f0 * sampleRate * 10) / 10;
      out += relTime.toFixed(timeDigits) + " " + Utils.buildSinSynComponentsString(f0, r.amplitudes, minAmplitudeDb) + eol; }
   return out; }
