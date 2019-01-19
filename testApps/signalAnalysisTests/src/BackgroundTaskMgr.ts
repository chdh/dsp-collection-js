// Background task manager using web workers.

interface RequestMessage {
   taskId:         string;
   parms:          any[]; }

interface ResponseMessage {
   ok:             boolean;
   errorMsg?:      string;
   result?:        any; }

//--- Both threads -------------------------------------------------------------

// Returns true if the current thread is a web worker thread.
export function isWorkerThread() : boolean {
   return !!(<any>self).WorkerGlobalScope; }

//--- Main thread --------------------------------------------------------------

var worker:                  Worker;
var taskActive:              boolean;
var activePromiseResolve:    Function;
var activePromiseReject:     Function;

export function execTask (taskId: string, parms: any[]) : Promise<any> {
   return new Promise((resolve: Function, reject: Function) => {
      if (taskActive) {
         throw new Error("A background task is already active."); }
      if (!worker) {
         worker = new Worker("app.js");
         worker.onmessage = workerToMainMessageEventHandler; }
      taskActive = true;
      activePromiseResolve = resolve;
      activePromiseReject = reject;
      const request: RequestMessage = {taskId, parms};
      worker.postMessage(request); }); }

function workerToMainMessageEventHandler (event: MessageEvent) {
   if (!taskActive) {
      console.log("Worker message ignored because no task is active.");
      return; }
   taskActive = false;
   const response = event.data;
   if (!response.ok) {
      activePromiseReject(new Error("Error in background task. " + response.errorMsg));
      return; }
   activePromiseResolve(response.result); }

//--- Worker thread ------------------------------------------------------------

const taskFunctions:         Map<string,Function> = new Map();

export function registerTaskFunction (taskId: string, taskFunction: Function) {
   taskFunctions.set(taskId, taskFunction); }

function processRequest2 (request: RequestMessage) : ResponseMessage {
   const taskFunction = taskFunctions.get(request.taskId);
   if (!taskFunction) {
      throw new Error("Undefined task ID \"" + request.taskId + "\"."); }
   const result = taskFunction.apply(self, request.parms);
   return {ok: true, result}; }

function processRequest (request: RequestMessage) : ResponseMessage {
   try {
      return processRequest2(request); }
    catch (e) {
      return {
         ok: false,
         errorMsg: e.toString()}; }}

function mainToWorkerMessageEventHandler (event: MessageEvent) {
   const response = processRequest(event.data);
   (<any>self).postMessage(response); }

export function initWorkerThread() {
   (<any>self).onmessage = mainToWorkerMessageEventHandler; }
