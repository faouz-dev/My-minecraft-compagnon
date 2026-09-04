const fs = require("node:fs");
const path = require("node:path");
const JavaScriptObfuscator = require("javascript-obfuscator");

const bundlePath = path.resolve(__dirname, "../dist/scripts/main.js");

if (!fs.existsSync(bundlePath)) {
  throw new Error(`Bundle introuvable: ${bundlePath}`);
}

const source = fs.readFileSync(bundlePath, "utf8");
const obfuscated = JavaScriptObfuscator.obfuscate(source, {
  compact: true,
  controlFlowFlattening: true,
  deadCodeInjection: false,
  stringArray: true,
  stringArrayRotate: true,
  stringArrayThreshold: 0.75,
});

fs.writeFileSync(bundlePath, obfuscated.getObfuscatedCode(), "utf8");
console.log(`Bundle obfusque: ${bundlePath}`);