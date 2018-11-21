import * as Utils from "./Utils";
import InternalAudioPlayer from "./InternalAudioPlayer";
import * as AnalysisBase from "./analysisModules/AnalysisBase";
import * as FunctionCurveViewer from "function-curve-viewer";
import {stripIndents as strip} from "common-tags";

var audioContext:                      AudioContext;
var audioPlayer:                       InternalAudioPlayer;

// GUI components:
var signalViewerElement:               HTMLCanvasElement;
var signalViewerWidget:                FunctionCurveViewer.Widget;
var analyzeButtonElement:              HTMLButtonElement;
var playButtonElement:                 HTMLButtonElement;
var analysisModuleSelectElement:       HTMLSelectElement;
var moduleSpecificParmsFormElement:    HTMLFormElement;
var analysisResultElement:             HTMLDivElement;

// Current audio signal (input signal):
var signalSamples:                     Float64Array;
var signalSampleRate:                  number;
var signalDuration:                    number;
var signalAudioBuffer:                 AudioBuffer;

//--- Viewers ------------------------------------------------------------------

function loadSignalViewer() {
   const viewerFunction = FunctionCurveViewer.createViewerFunctionForFloat64Array(signalSamples, signalSampleRate);
   const xRange = 0.050;
   const yRange = 1.2;
   const xMin = Math.max(0, (signalDuration - xRange) / 2);
   const viewerState : FunctionCurveViewer.ViewerState = {
      viewerFunction:  viewerFunction,
      xMin:            xMin,
      xMax:            xMin + xRange,
      yMin:            -yRange,
      yMax:            yRange,
      gridEnabled:     true,
      primaryZoomMode: FunctionCurveViewer.ZoomMode.x,
      xAxisUnit:       "s" };
   signalViewerWidget.setViewerState(viewerState); }

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

async function loadAudioFileData (fileData: ArrayBuffer) {
   const audioBuffer = await audioContext.decodeAudioData(fileData);
   signalSamples = new Float64Array(audioBuffer.getChannelData(0));   // only the first channel is used
   signalSampleRate = audioBuffer.sampleRate;
   signalDuration = signalSamples.length / signalSampleRate;
   signalAudioBuffer = audioBuffer;
   loadSignalViewer();
   refreshButtons(); }

async function loadLocalAudioFile (file: File) {
   try {
      const fileData = await Utils.loadFileData(file);
      await loadAudioFileData(fileData); }
    catch (e) {
      alert("Error: " + e); }}

function loadLocalAudioFileButton_click() {
   Utils.openFileOpenDialog(loadLocalAudioFile); }

async function loadFileByUrl (url: string) : Promise<ArrayBuffer> {
   const response = await fetch(url, {mode: "cors"});   // (server must send "Access-Control-Allow-Origin" header field or have same origin)
   if (!response.ok) {
      throw new Error("Request failed for " + url); }
   return await response.arrayBuffer(); }

async function loadAudioFileFromUrl (url: string) {
   const fileData = await loadFileByUrl(url);
   await loadAudioFileData(fileData); }

//--- Analysis -----------------------------------------------------------------

function showAnalysisResult (analysisResult: AnalysisBase.AnalysisResult) {
   const syncWidgets: FunctionCurveViewer.Widget[] = [];
   analysisResultElement.innerHTML = "";
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
      viewerWidget.setViewerState(block.viewerState);
      if (block.syncXPosition) {
         syncWidgets.push(viewerWidget);
         viewerWidget.addEventListener("viewportchange", () => synchronizeViewers(viewerWidget, syncWidgets)); }}}

function analyzeButton_click() {
   if (!signalSamples) {
      alert("No signal loaded.");
      return; }
   const signalViewerState = signalViewerWidget.getViewerState();
   const analysisParms: AnalysisBase.AnalysisParms = {
      samples:      signalSamples,
      sampleRate:   signalSampleRate,
      viewportXMin: signalViewerState.xMin,
      viewportXMax: signalViewerState.xMax,
      formParms:    new FormData(moduleSpecificParmsFormElement) };
   const moduleDescr = getModuleDescr();
   const analysisResult = moduleDescr.f(analysisParms);
   showAnalysisResult(analysisResult); }

//------------------------------------------------------------------------------

function signalViewerHelpButton_click() {
   const t = document.getElementById("signalViewerHelpText")!;
   t.innerHTML = signalViewerWidget.getFormattedHelpText();
   t.classList.toggle("hidden"); }

async function playButton_click() {
   if (audioPlayer.isPlaying()) {
      audioPlayer.stop(); }
    else {
      if (!signalAudioBuffer) {
         alert("No signal loaded.");
         return; }
      await audioPlayer.playAudioBuffer(signalAudioBuffer); }}

function refreshButtons() {
   analyzeButtonElement.disabled = !signalSamples;
   playButtonElement.disabled = !signalSamples;
   playButtonElement.textContent = audioPlayer.isPlaying() ? "Stop" : "Play"; }

function getModuleDescr() {
   const moduleId = analysisModuleSelectElement.value;
   return AnalysisBase.getModuleDescrById(moduleId); }

function selectAnalysisModule() {
   const moduleDescr = getModuleDescr();
   moduleSpecificParmsFormElement.innerHTML = moduleDescr.formParmsHtml;
   if (moduleDescr.refreshFormParms) {
      moduleDescr.refreshFormParms(); }}

function moduleSpecificParmsForm_change (_e: Event) {
   const moduleDescr = getModuleDescr();
   if (moduleDescr.refreshFormParms) {
      moduleDescr.refreshFormParms(); }}

async function startup2() {
   audioContext = new ((<any>window).AudioContext || (<any>window).webkitAudioContext)();
   audioPlayer = new InternalAudioPlayer(audioContext);
   audioPlayer.addEventListener("stateChange", refreshButtons);
   signalViewerElement = <HTMLCanvasElement>document.getElementById("signalViewer");
   signalViewerWidget = new FunctionCurveViewer.Widget(signalViewerElement);
   document.getElementById("signalViewerHelpButton")!.addEventListener("click", signalViewerHelpButton_click);
   analysisModuleSelectElement = <HTMLSelectElement>document.getElementById("analysisModuleSelect");
   for (const moduleDescr of AnalysisBase.analysisModuleIndex) {
      analysisModuleSelectElement.add(new Option(moduleDescr.name, moduleDescr.id)); }
   analysisModuleSelectElement.addEventListener("change", selectAnalysisModule);
   moduleSpecificParmsFormElement = <HTMLFormElement>document.getElementById("moduleSpecificParmsForm");
   moduleSpecificParmsFormElement.addEventListener("submit", (e: Event) => e.preventDefault());
   moduleSpecificParmsFormElement.addEventListener("change", moduleSpecificParmsForm_change);
   analysisResultElement = <HTMLDivElement>document.getElementById("analysisResult");
   document.getElementById("loadLocalAudioFileButton")!.addEventListener("click", loadLocalAudioFileButton_click);
   analyzeButtonElement = <HTMLButtonElement>document.getElementById("analyzeButton")!;
   analyzeButtonElement.addEventListener("click", analyzeButton_click);
   playButtonElement = <HTMLButtonElement>document.getElementById("playButton")!;
   playButtonElement.addEventListener("click", playButton_click);
   refreshButtons();
   selectAnalysisModule();
   if (window.location.protocol != "file:") {
      await loadAudioFileFromUrl("testSound1.mp3"); }}

async function startup() {
   try {
      await startup2(); }
    catch (e) {
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
