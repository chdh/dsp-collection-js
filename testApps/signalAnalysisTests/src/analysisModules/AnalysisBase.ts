// Central base module for the signal analysis modules.

import * as FunctionCurveViewer from "function-curve-viewer";

import * as ShortTimeFourierTransform from "./ShortTimeFourierTransform.ts";
import * as ShortTimePitchDetectionAtTime from "./ShortTimePitchDetectionAtTime.ts";
import * as ShortTimePitchDetectionOverTime from "./ShortTimePitchDetectionOverTime.ts";
import * as InstantaneousFrequencyAtTime from "./InstantaneousFrequencyAtTime.ts";
import * as InstantaneousFrequencyOverTime from "./InstantaneousFrequencyOverTime.ts";
import * as SignalEnvelope from "./SignalEnvelope.ts";

export type AnalysisFunction = (parms: AnalysisParms) => AnalysisResult | Promise<AnalysisResult>;

export interface AnalysisModuleDescr {                     // analysis module descriptor
   name:                     string;                       // descriptive name
   id:                       string;                       // internal ID
   f:                        AnalysisFunction;             // function performing the analysis
   formParmsHtml:            string;                       // HTML for module-specific form parameters
   onFormParmsChange?:       (event?: Event) => void;      // called when the module-specific form parameters have been changed
   onSignalViewportChange?:  (viewerState: FunctionCurveViewer.ViewerState) => void; // called when the vieport of the signal viewer has changed
   wideRange?:               boolean; }                    // true if this is a wide range analysis

export const analysisModuleIndex: AnalysisModuleDescr[] = [
   ShortTimeFourierTransform.moduleDescriptor,
   InstantaneousFrequencyAtTime.moduleDescriptor,
   InstantaneousFrequencyOverTime.moduleDescriptor,
   ShortTimePitchDetectionAtTime.moduleDescriptor,
   ShortTimePitchDetectionOverTime.moduleDescriptor,
   SignalEnvelope.moduleDescriptor,
   ];

export function getModuleDescrById (id: string) : AnalysisModuleDescr {
   for (const descr of analysisModuleIndex) {
      if (descr.id == id) {
         return descr; }}
   throw new Error("Undefined analysis module id \"" + id + "\"."); }

export interface AnalysisParms {
   samples:                  Float64Array;                 // signal samples
   sampleRate:               number;                       // sample rate in Hz
   viewportXMin:             number;                       // viewport start position in seconds
   viewportXMax:             number;                       // viewport end position in seconds
   viewportSamples:          Float64Array;                 // viewport segment samples (subset of samples array)
   fileName:                 string; }                     // file name of audio signal

export interface AnalysisResultBlock {
   title:                    string;
   cssClass:                 string;
   viewerState:              Partial<FunctionCurveViewer.ViewerState>;
   syncXPosition?:           boolean; }                    // true to synchronize the X position with the other result viewers

export interface AnalysisResult {
   blocks:                   AnalysisResultBlock[]; }
