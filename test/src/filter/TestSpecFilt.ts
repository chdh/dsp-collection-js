import * as SpecFilt from "dsp-collection/filter/SpecFilt.js";
import * as Fs from "fs";
import * as WavFileEncoder from "wav-file-encoder";
import * as WavFileDecoder from "wav-file-decoder";

var inputFileName:           string;
var filterType:              string;
var filterFreq1:             number;
var filterFreq2:             number;
var outputFileName:          string;

var inputSamples:            Float32Array;
var outputSamples:           Float64Array;
var sampleRate:              number;

function readCommandLineArgs() {
   const args = process.argv.slice(2);
   if (args.length != 5) {
      throw new Error("Invalid number of command line arguments."); }
   inputFileName = args[0];
   filterType = args[1];
   filterFreq1 = parseFloat(args[2]);
   filterFreq2 = parseFloat(args[3]);
   outputFileName = args[4]; }

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
   const filterFreq1Norm = filterFreq1 / sampleRate;
   const filterFreq2Norm = filterFreq2 / sampleRate;
   const smoothingWidthNorm = 100 / sampleRate;
   outputSamples = SpecFilt.filterSignal(inputSamples, <SpecFilt.FilterType>filterType, filterFreq1Norm, filterFreq2Norm, smoothingWidthNorm);
   writeOutputFile(); }

main();
