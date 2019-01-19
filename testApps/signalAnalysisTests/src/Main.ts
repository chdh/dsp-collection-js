import * as Utils from "./Utils";
import * as DomUtils from "./DomUtils";
import InternalAudioPlayer from "./InternalAudioPlayer";
import * as BackgroundTaskMgr from "./BackgroundTaskMgr";
import * as AnalysisBase from "./analysisModules/AnalysisBase";
import * as WindowFunctions from "dsp-collection/signal/WindowFunctions";
import * as FunctionCurveViewer from "function-curve-viewer";
import * as DialogManager from "dialog-manager";
import {stripIndents as strip} from "common-tags";

const defaultAudioFileUrl = "testSound1.mp3";

var audioContext:                      AudioContext;
var audioPlayer:                       InternalAudioPlayer;
var dynamicViewerWidgets:              FunctionCurveViewer.Widget[] = [];

// GUI components:
var signalViewerElement:               HTMLCanvasElement;
var signalViewerWidget:                FunctionCurveViewer.Widget;
var analyzeButtonElement:              HTMLButtonElement;
var playButtonElement:                 HTMLButtonElement;
var playSegmentButtonElement:          HTMLButtonElement;
var analysisModuleSelectElement:       HTMLSelectElement;
var moduleSpecificParmsFormElement:    HTMLFormElement;
var analysisResultElement:             HTMLDivElement;

// Current audio signal (input signal):
var signalSamples:                     Float64Array;
var signalSampleRate:                  number;
var signalFileName:                    string;

//--- Viewers ------------------------------------------------------------------

function loadSignalViewer (centerPosition: number, viewportWidth: number) {
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(signalSamples, signalSampleRate);
   const yRange = 1.2;
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  viewerFunction,
      xMin:            Math.max(0, centerPosition - viewportWidth / 2),
      xMax:            Math.min(signalSamples.length / signalSampleRate, centerPosition + viewportWidth / 2),
      yMin:            -yRange,
      yMax:            yRange,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s" };
   signalViewerWidget.setViewerState(viewerState); }

function signalViewer_viewportchange() {
   DomUtils.showElement("zoomOutNote", false);
   const vState = signalViewerWidget.getViewerState();
   const viewportMs = (vState.xMax - vState.xMin) * 1000;
   const digits = Math.max(0, -Math.floor(Math.log10(viewportMs / 50)));
   document.getElementById("viewportWidth")!.textContent = viewportMs.toFixed(digits) + " ms";
   const moduleDescr = getModuleDescr();
   if (moduleDescr.onSignalViewportChange) {
      moduleDescr.onSignalViewportChange(vState); }}

function zoomToFitButton_click() {
   if (!signalSamples) {
      return; }
   const vState = signalViewerWidget.getViewerState();
   vState.xMin = 0;
   vState.xMax = signalSamples.length / signalSampleRate;
   signalViewerWidget.setViewerState(vState);
   signalViewer_viewportchange(); }

// Synchronizes the X axis viewport between a group of viewers.
function synchronizeViewers (activeWidget: FunctionCurveViewer.Widget, widgetGroup: FunctionCurveViewer.Widget[]) {
   const state1 = activeWidget.getViewerState();
   for (const widget2 of widgetGroup) {
      if (widget2 == activeWidget) {
         continue; }
      const state2 = widget2.getViewerState();
      state2.xMin = state1.xMin;
      state2.xMax = state1.xMax;
      widget2.setViewerState(state2); }}

//--- Load audio file ----------------------------------------------------------

async function loadAudioFileData (fileData: ArrayBuffer, fileName: string, centerPositionParm?: number) {
   const audioBuffer = await audioContext.decodeAudioData(fileData);
   signalSamples = new Float64Array(audioBuffer.getChannelData(0));   // only the first channel is used
   signalSampleRate = audioBuffer.sampleRate;
   signalFileName = fileName;
   const signalDuration = signalSamples.length / signalSampleRate;
   const viewportWidth = (centerPositionParm == undefined && getModuleDescr().wideRange) ? signalDuration : 0.050;
   const centerPosition = centerPositionParm || signalDuration / 2;
   loadSignalViewer(centerPosition, viewportWidth);
   document.getElementById("fileName")!.textContent = fileName;
   DomUtils.showElement("zoomToFitButton");
   signalViewer_viewportchange();
   refreshButtons(); }

async function loadLocalAudioFile (file: File) {
   try {
      const fileData = await Utils.loadFileData(file);
      await loadAudioFileData(fileData, file.name); }
    catch (e) {
      alert("Error: " + e); }}

function loadLocalAudioFileButton_click() {
   Utils.openFileOpenDialog(loadLocalAudioFile); }

async function loadFileByUrl (url: string) : Promise<ArrayBuffer> {
   const response = await fetch(url, {mode: "cors"});   // (server must send "Access-Control-Allow-Origin" header field or have same origin)
   if (!response.ok) {
      throw new Error("Request failed for " + url); }
   return await response.arrayBuffer(); }

async function loadAudioFileFromUrl (url: string, centerPosition: number|undefined) {
   const fileData = await loadFileByUrl(url);
   const fileName = url.substring(url.lastIndexOf("/") + 1);
   await loadAudioFileData(fileData, fileName, centerPosition); }

async function loadInitialAudioFile() {
   try {
      const parmsString = window.location.hash.substring(1);
      const usp = new URLSearchParams(parmsString);
      const audioFileUrl = usp.get("file") || defaultAudioFileUrl;
      const centerPosition = Utils.getNumericUrlSearchParam(usp, "pos");
      await loadAudioFileFromUrl(audioFileUrl, centerPosition); }
    catch (e) {
      if (window.location.protocol == "file:") {           // ignore error when running from local file system
         console.log("Unable to load initial audio file.", e);
         return; }
      throw e; }}

//--- Analysis -----------------------------------------------------------------

function releaseDynamicViewerWidgets() {
   for (const viewerWidget of dynamicViewerWidgets) {
      viewerWidget.setConnected(false); }
   dynamicViewerWidgets = []; }

function showAnalysisResult (analysisResult: AnalysisBase.AnalysisResult) {
   const syncWidgets: FunctionCurveViewer.Widget[] = [];
   analysisResultElement.innerHTML = "";
   releaseDynamicViewerWidgets();
   for (const block of analysisResult.blocks) {
      const html = strip`
         <div class="analysisResultBlock ${block.cssClass}">
          <div class="title">${block.title}</div>
          <canvas class="resultViewer" tabindex="1"></canvas>
         </div>`;
      const fragment = document.createRange().createContextualFragment(html);
      const canvasElement = fragment.querySelector("canvas")!;
      analysisResultElement.appendChild(fragment);
      const viewerWidget = new FunctionCurveViewer.Widget(canvasElement);
      dynamicViewerWidgets.push(viewerWidget);
      viewerWidget.setViewerState(block.viewerState);
      if (block.syncXPosition) {
         syncWidgets.push(viewerWidget);
         viewerWidget.addEventListener("viewportchange", () => synchronizeViewers(viewerWidget, syncWidgets)); }}}

async function analyzeButton_click() {
   if (!signalSamples) {
      alert("No signal loaded.");
      return; }
   const signalViewerState = signalViewerWidget.getViewerState();
   const analysisParms: AnalysisBase.AnalysisParms = {
      samples:         signalSamples,
      sampleRate:      signalSampleRate,
      viewportXMin:    signalViewerState.xMin,
      viewportXMax:    signalViewerState.xMax,
      viewportSamples: getViewportSegmentSamples(),
      fileName:        signalFileName };
   const moduleDescr = getModuleDescr();
   const analysisResultOrPromise = moduleDescr.f(analysisParms);
   let analysisResult: AnalysisBase.AnalysisResult;
   if (analysisResultOrPromise instanceof Promise) {
      DialogManager.showProgressInfo({
         msgText: "Processing...",
         delayTime: 250 });
      try {
         analysisResult = await analysisResultOrPromise; }
       finally {
         DialogManager.closeProgressInfo(); }}
    else {
      analysisResult = analysisResultOrPromise; }
   showAnalysisResult(analysisResult); }

function getViewportSegmentSamples() : Float64Array {
   const signalViewerState = signalViewerWidget.getViewerState();
   const startPos = Math.max(0, Math.min(signalSamples.length, Math.ceil(signalViewerState.xMin * signalSampleRate)));
   const endPos = Math.max(startPos, Math.min(signalSamples.length, Math.floor(signalViewerState.xMax * signalSampleRate)));
   return signalSamples.subarray(startPos, endPos); }

//------------------------------------------------------------------------------

function signalViewerHelpButton_click() {
   const t = document.getElementById("signalViewerHelpText")!;
   t.innerHTML = signalViewerWidget.getFormattedHelpText();
   t.classList.toggle("hidden"); }

function prepareToPlay() : boolean {
   if (audioPlayer.isPlaying()) {
      audioPlayer.stop();
      return false; }
   if (!signalSamples) {
      alert("No signal loaded.");
      return false; }
   return true; }

async function playButton_click() {
   if (!prepareToPlay()) {
      return; }
   await audioPlayer.playSamples(signalSamples, signalSampleRate); }

function prepareAudioSegment (samples: Float64Array, sampleRate: number, mode: string) : Float64Array {
   switch (mode) {
      case "raw": {
         return samples; }
      case "windowed": {
         return WindowFunctions.applyWindow(samples, WindowFunctions.hannWindow); }
      case "faded": {
         return Utils.fadeAudioSignal(samples, 0.020 * sampleRate, WindowFunctions.hannWindow); }
      case "1sRaw": {
         const a = Utils.repeatSignal(samples, sampleRate);
         Utils.fadeAudioSignalInPlace(a, 0.020 * sampleRate, WindowFunctions.hannWindow);
         return a; }
      case "1sWin": {
         const a1 = WindowFunctions.applyWindow(samples, WindowFunctions.hannWindow);
         const a2 = Utils.repeatSignal(a1, sampleRate);
         Utils.fadeAudioSignalInPlace(a2, 0.020 * sampleRate, WindowFunctions.hannWindow);
         return a2; }
      case "1sCorr": {
         const minFrequency = 60;
         const minOverlap = Math.floor(Math.min(sampleRate / minFrequency * 0.75, samples.length / 4));
         const maxOverlap = Math.ceil(Math.min(sampleRate / minFrequency * 2, samples.length / 1.9));
         const a = Utils.repeatSignalCorrelatedSuperimposed(samples, sampleRate, minOverlap, maxOverlap);
         Utils.fadeAudioSignalInPlace(a, 0.020 * sampleRate, WindowFunctions.hannWindow);
         return a; }
      default: {
         throw new Error("Unsupported audio segment mode \"" + mode + "\"."); }}}

async function playSegmentButton_click() {
   if (!prepareToPlay()) {
      return; }
   const segmentSamples = getViewportSegmentSamples();
   const segmentPlayMode = (<HTMLSelectElement>document.getElementById("segmentPlayMode"))!.value;
   const samples = prepareAudioSegment(segmentSamples, signalSampleRate, segmentPlayMode);
   // signalSamples = samples;
   // loadSignalViewer(samples.length / signalSampleRate / 2, 0.050);
   await audioPlayer.playSamples(samples, signalSampleRate); }

function refreshButtons() {
   analyzeButtonElement.disabled = !signalSamples;
   playButtonElement.disabled = !signalSamples;
   playButtonElement.textContent = audioPlayer.isPlaying() ? "Stop" : "Play";
   playSegmentButtonElement.disabled = !signalSamples;
   playSegmentButtonElement.textContent = audioPlayer.isPlaying() ? "Stop" : "Play Segment"; }

function getModuleDescr() {
   const moduleId = analysisModuleSelectElement.value;
   return AnalysisBase.getModuleDescrById(moduleId); }

function selectAnalysisModule() {
   const moduleDescr = getModuleDescr();
   moduleSpecificParmsFormElement.innerHTML = moduleDescr.formParmsHtml;
   const vState = signalViewerWidget.getViewerState();
   const viewportMs = (vState.xMax - vState.xMin) * 1000;
   DomUtils.showElement("zoomOutNote", !!moduleDescr.wideRange && viewportMs <= 100);
   if (moduleDescr.onFormParmsChange) {
      moduleDescr.onFormParmsChange(); }
   if (moduleDescr.onSignalViewportChange) {
      moduleDescr.onSignalViewportChange(vState); }}

function moduleSpecificParmsForm_change (event: Event) {
   DomUtils.showElement("zoomOutNote", false);
   const moduleDescr = getModuleDescr();
   if (moduleDescr.onFormParmsChange) {
      moduleDescr.onFormParmsChange(event); }}

async function startup2() {
   audioContext = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)();
   audioPlayer = new InternalAudioPlayer(audioContext);
   audioPlayer.addEventListener("stateChange", refreshButtons);
   signalViewerElement = <HTMLCanvasElement>document.getElementById("signalViewer");
   signalViewerWidget = new FunctionCurveViewer.Widget(signalViewerElement);
   signalViewerWidget.addEventListener("viewportchange", signalViewer_viewportchange);
   document.getElementById("zoomToFitButton")!.addEventListener("click", zoomToFitButton_click);
   document.getElementById("signalViewerHelpButton")!.addEventListener("click", signalViewerHelpButton_click);
   analysisModuleSelectElement = <HTMLSelectElement>document.getElementById("analysisModuleSelect");
   for (const moduleDescr of AnalysisBase.analysisModuleIndex) {
      analysisModuleSelectElement.add(new Option(moduleDescr.name, moduleDescr.id)); }
   analysisModuleSelectElement.addEventListener("change", () => Utils.catchError(selectAnalysisModule));
   moduleSpecificParmsFormElement = <HTMLFormElement>document.getElementById("moduleSpecificParmsForm");
   moduleSpecificParmsFormElement.addEventListener("submit", (e: Event) => e.preventDefault());
   moduleSpecificParmsFormElement.addEventListener("change", (e: Event) => Utils.catchError(moduleSpecificParmsForm_change, e));
   analysisResultElement = <HTMLDivElement>document.getElementById("analysisResult");
   document.getElementById("loadLocalAudioFileButton")!.addEventListener("click", loadLocalAudioFileButton_click);
   analyzeButtonElement = <HTMLButtonElement>document.getElementById("analyzeButton")!;
   analyzeButtonElement.addEventListener("click", () => Utils.catchError(analyzeButton_click));
   playButtonElement = <HTMLButtonElement>document.getElementById("playButton")!;
   playButtonElement.addEventListener("click", () => Utils.catchError(playButton_click));
   playSegmentButtonElement = <HTMLButtonElement>document.getElementById("playSegmentButton")!;
   playSegmentButtonElement.addEventListener("click", () => Utils.catchError(playSegmentButton_click));
   refreshButtons();
   selectAnalysisModule();
   await loadInitialAudioFile(); }

async function startup() {
   try {
      await startup2(); }
    catch (e) {
      alert("Error: " + e); }}

if (BackgroundTaskMgr.isWorkerThread()) {
   BackgroundTaskMgr.initWorkerThread(); }
 else {
   document.addEventListener("DOMContentLoaded", startup); }
