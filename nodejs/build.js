const esbuild = require('esbuild')
const pkg = require('./package.json')
const fs = require("fs");

esbuild.buildSync({
    bundle: true,

    platform: "node",
    external: Object.keys(pkg.dependencies),

    entryPoints: ['index.ts'],
    outfile: "build/index.js"
})

fs.copyFileSync("package.json", "build/package.json")
