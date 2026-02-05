#!/usr/bin/env node
import { mkdirSync as makeDirectorySync, writeFileSync } from "fs"
import packageJson from "../package.json" with { type: "json" }
import { getExports } from "./lib/exports.js"

/** @type {Record<string, string>} */ const ConvertToJsr = {
	"@samual/types": "@samual/types",
	"@samual/try": "@sn/try"
}

const { version, license, dependencies } = packageJson

makeDirectorySync("dist", { recursive: true })

const imports = Object.fromEntries(Object.entries(dependencies).map(
	([ name, version ],) => [ name, `${name in ConvertToJsr ? `jsr:${ConvertToJsr[name]}` : `npm:${name}`}@${version}` ]
))

writeFileSync(
	"dist/jsr.json",
	JSON.stringify({ name: `@sn/jsodd`, version, license, exports: await getExports(`.d.ts`, `.js`), imports }, undefined, "\t")
)
