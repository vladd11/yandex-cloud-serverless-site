const esbuild = require('esbuild')
const pkg = require('./package.json')
const fs = require("fs");

esbuild.buildSync({
    bundle: true,
    minify: true,

    platform: "node",
    external: Object.keys(pkg.dependencies),

    entryPoints: ['index.ts'],
    outfile: "build/index.js",
    sourcemap: "external"
})

fs.copyFileSync("package.json", "build/package.json")
fs.copyFileSync("package-lock.json", "build/package-lock.json")
