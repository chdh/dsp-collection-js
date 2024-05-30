const config = require("../eslint.config.cjs");

config.push({
   rules: {
      "@typescript-eslint/no-unused-vars": "off",
      }});

module.exports = config;
