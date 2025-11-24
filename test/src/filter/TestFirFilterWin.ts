import * as FirFilterWin from "dsp-collection/filter/FirFilterWin.js";
import * as Fs from "fs";
import * as WavFileEncoder from "wav-file-encoder";
import * as WavFileDecoder from "wav-file-decoder";

var inputFileName:           string;
var windowFunctionId:        string;
var firstMinFreq:            number;
var outputFileName:          string;

var inputSamples:            Float32Array;
var outputSamples:           Float64Array;
var sampleRate:              number;

function readCommandLineArgs() {
   const args = process.argv.slice(2);
   if (args.length != 4) {
      throw new Error("Invalid number of command line arguments."); }
   inputFileName = args[0];
   windowFunctionId = args[1];
   firstMinFreq = parseFloat(args[2]);
   outputFileName = args[3]; }

function loadInputFile() {
   const buf = Fs.readFileSync(inputFileName);
   const audioData = WavFileDecoder.decodeWavFile(buf);
   if (audioData.channelData.length > 1) {
      console.log("Warning: Only the first auto channel is used."); }
   inputSamples = audioData.channelData[0];
   sampleRate = audioData.sampleRate; }

function writeOutputFile() {
   const buf = WavFileEncoder.encodeWavFile2([outputSamples], sampleRate, WavFileEncoder.WavFileType.float32);
   Fs.writeFileSync(outputFileName, Buffer.from(buf)); }

function main() {
   readCommandLineArgs();
   loadInputFile();
   const normFirstMinFreq = firstMinFreq / sampleRate;
   outputSamples = FirFilterWin.filterArray(inputSamples, {windowFunctionId, normFirstMinFreq});
   writeOutputFile(); }

main();
