import * as TestWindowFunctions from "./TestWindowFunctions.ts";

function startup2() {
   const applId = document.body.dataset.applId;
   switch (applId) {
      case "testWindowFunctions": {
         TestWindowFunctions.startup();
         break; }
      default: {
         throw new Error("Uexpected applId " + applId); }}}

function startup() {
   try {
      startup2(); }
    catch (e) {
      alert("Error: " + e); }}

document.addEventListener("DOMContentLoaded", startup);
