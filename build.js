"use strict";

import * as ChildProcess from "child_process";
import * as Fs from "fs";

class BuildError extends Error {};

// Executes a shell command line.
// An error is thrown when the exit code of the command is not 0.
function shell (cmdLine) {
   ChildProcess.execSync(cmdLine, {stdio: "inherit"}); }

function delDir (dirName) {
   Fs.rmSync(dirName, {recursive: true, force: true}); }

function main2() {
   const argv = process.argv;
   if (argv.length > 3) {
      throw new BuildError("Extra command line parameters."); }
   let cmd = (argv.length > 2) ? argv[2] : "build";
   switch (cmd) {
      case "clean": {
         delDir("dist");
         break; }
      case "build": {
         delDir("dist");
         shell("tsc");
         shell("eslint \"src/**/*.ts\"");
         console.log("Build completed.");
         break; }
      case "doc": {
         deldir("apiDoc");
         shell("typedoc --options typedoc.config.js");
         break; }
      default: {
         throw new BuildError(`Invalid command parameter "${cmd}".`); }}}

function main() {
   try {
      main2(); }
    catch (e) {
      if (e instanceof BuildError) {
         console.log(e.message); }
       else {
         console.log(e.toString()); }
      process.exitCode = 99;
      return; }}

main();
