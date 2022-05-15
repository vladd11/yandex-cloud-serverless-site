const esbuild = require('esbuild')

esbuild.build({
    bundle: true,
    minify: true,
    platform: "node",
    external: ['ydb-sdk', 'jsonwebtoken', 'uuid'],

    entryPoints: ['index.ts'],
    outfile: "build/index.js"
})

