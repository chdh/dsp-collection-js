import nodeResolve from "@rollup/plugin-node-resolve";
import alias from "@rollup/plugin-alias";

export default {
   input: "tempBuild/Main.js",
   output: {
      file: "dist/app.js",
      format: "iife"
   },
   plugins: [
      nodeResolve(),
      alias({
         entries: {
            "dsp-collection": "./../../../dist"
         }
      })
   ]
};
