import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// precedencia: variables ya presentes en el entorno, luego .env.local, luego .env
function parse(file) {
  if (!existsSync(file)) return
  const raw = readFileSync(file, 'utf8').replace(/^﻿/, '')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!value) continue
    if (process.env[key] === undefined) process.env[key] = value
  }
}

parse(join(root, '.env.local'))
parse(join(root, '.env'))
