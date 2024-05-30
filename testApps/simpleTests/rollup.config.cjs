const Path = require('node:path');
const nodeResolve = require("@rollup/plugin-node-resolve");
const alias = require("@rollup/plugin-alias");

module.exports = {
   input: "tempBuild/Main.js",
   output: {
      file: "dist/app.js",
      format: "iife"
   },
   plugins: [
      nodeResolve(),
      alias({
         entries: {
            "dsp-collection": Path.resolve("../../dist")
         }
      })
   ]
};
