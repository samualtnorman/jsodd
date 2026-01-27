#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";

const [ ,, targetPath ] = process.argv

if (!targetPath)
	process.exit(1)

const readme = readFileSync(0, { encoding: `utf8` }).trim().replaceAll(`*/`, `*\u200D/`).replaceAll(`\n`, `\n * `)
const targetContent = readFileSync(targetPath, { encoding: `utf8` })

writeFileSync(targetPath, `/**\n * ${readme}\n * @module\n */\n${targetContent}`,)
