// Central base module for the signal analysis modules.

import * as FunctionCurveViewer from "function-curve-viewer";
import * as ShortTimeFourierTransform from "./ShortTimeFourierTransform";
import * as ShortTimePitchDetection from "./ShortTimePitchDetection";

export type AnalysisFunction = (parms: AnalysisParms) => AnalysisResult;

export interface AnalysisModuleDescr {                     // analysis module descriptor
   name:                     string;                       // descriptive name
   id:                       string;                       // internal ID
   f:                        AnalysisFunction;             // function performing the analysis
   formParmsHtml:            string;                       // HTML for module-specific form parameters
   refreshFormParms?:        Function; }                   // function to refresh the module-specific form parameters

export const analysisModuleIndex: AnalysisModuleDescr[] = [
   ShortTimeFourierTransform.moduleDescriptor,
   ShortTimePitchDetection.moduleDescriptor,
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
   formParms:                FormData; }                   // module-specific form parameters

export interface AnalysisResultBlock {
   title:                    string;
   cssClass:                 string;
   viewerState:              FunctionCurveViewer.ViewerState;
   syncXPosition?:           boolean; }                    // true to synchronize the X position with the other result viewers

export interface AnalysisResult {
   blocks:                   AnalysisResultBlock[]; }
