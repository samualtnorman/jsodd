#!/usr/bin/env node
import { Eta } from "eta"
import { readFileSync } from "fs"

process.stdout.write(await new Eta().renderStringAsync(readFileSync(0, { encoding: `utf8` }), {}))
