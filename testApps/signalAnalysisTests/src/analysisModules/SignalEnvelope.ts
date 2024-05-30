// Analysis module for signal envelope.

import {stripIndents as strip} from "common-tags";
import * as EnvelopeDetection from "dsp-collection/signal/EnvelopeDetection.js";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as DspUtils from "dsp-collection/utils/DspUtils.js";
import * as AnalysisBase from "./AnalysisBase.js";
import * as DomUtils from "../DomUtils.js";

const formParmsHtml = strip`
   <div class="parmLine">
    <label class="width1" for="windowWidthDc" title="Window width in ms for moving average for calculating the DC component.">Win. w. DC [ms]:</label>
    <input class="width1" id="windowWidthDc" type="number" step="any" required value="200">
    <label class="width1 gap1" for="windowWidthEnvelope" title="Window width in ms for moving average for envelope generation.">Win. w. env. [ms]:</label>
    <input class="width1" id="windowWidthEnvelope" type="number" step="any" required value="50">
   </div>
   `;

export const moduleDescriptor: AnalysisBase.AnalysisModuleDescr = {
   name:                "Signal envelope",
   id:                  "envelope",
   f:                   main,
   formParmsHtml:       formParmsHtml };

function main (parms: AnalysisBase.AnalysisParms) : AnalysisBase.AnalysisResult {
   const sampleRate = parms.sampleRate;
   const windowWidthDc       = DomUtils.getValueNum("windowWidthDc");
   const windowWidthEnvelope = DomUtils.getValueNum("windowWidthEnvelope");
   const linBuf = EnvelopeDetection.generateSignalEnvelope(parms.samples, Math.round(windowWidthDc / 1000 * sampleRate), Math.round(windowWidthEnvelope /1000 * sampleRate));
   const linEnvelopeViewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(linBuf, sampleRate);
   const logBuf = linBuf.map(DspUtils.convertAmplitudeToDb);
   const logEnvelopeViewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(logBuf, sampleRate);
   const linEnvelopeViewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  linEnvelopeViewerFunction,
      xMin:            parms.viewportXMin,
      xMax:            parms.viewportXMax,
      yMin:            0,
      yMax:            1,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s"};
   const logEnvelopeViewerState: Partial<FunctionCurveViewer.ViewerState> = {
      viewerFunction:  logEnvelopeViewerFunction,
      xMin:            parms.viewportXMin,
      xMax:            parms.viewportXMax,
      yMin:            -80,
      yMax:            0,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s",
      yAxisUnit:       "dB"};
   return {
      blocks: [
         { title:          "Linear envelope",
           cssClass:       "result250",
           viewerState:    linEnvelopeViewerState,
           syncXPosition:  true },
         { title:          "Logarithmic envelope",
           cssClass:       "result250",
           viewerState:    logEnvelopeViewerState,
           syncXPosition:  true },
         ]}; }
