import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'

const roots = ['src', 'scripts', 'bin']
const extensions = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
])
const ignored = new Set(['node_modules', 'dist', '.git', 'coverage', '.devspace'])

function walk(directory: string): string[] {
  if (!existsSync(directory)) return []
  const files: string[] = []
  for (const entry of readdirSync(directory)) {
    if (ignored.has(entry)) continue
    const path = join(directory, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) files.push(...walk(path))
    else if (extensions.has(extname(path))) files.push(normalize(path))
  }
  return files
}

const files = roots.flatMap(walk)
const absoluteFiles = new Set(files.map(file => normalize(resolve(file))))
const textByFile = new Map(files.map(file => [file, readFileSync(file, 'utf8')]))
const imports = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g

function resolveImport(importer: string, specifier: string): string | undefined {
  let base: string
  if (specifier.startsWith('src/')) base = resolve(specifier)
  else if (specifier.startsWith('.')) base = resolve(dirname(importer), specifier)
  else return undefined
  const candidates = [
    base,
    ...[...extensions].map(extension => `${base}${extension}`),
    ...[...extensions].map(extension => join(base, `index${extension}`)),
  ]
  for (const candidate of candidates) {
    const normalized = normalize(candidate)
    if (absoluteFiles.has(normalized)) return normalized
    const sourceExtensionMatch = specifier.match(/\.(?:mjs|cjs|js|jsx)$/)
    if (sourceExtensionMatch) {
      const withoutRuntimeExtension = candidate.slice(
        0,
        -sourceExtensionMatch[0].length,
      )
      for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
        const source = normalize(`${withoutRuntimeExtension}${extension}`)
        if (absoluteFiles.has(source)) return source
      }
    }
  }
  return undefined
}

const inbound = new Map<string, Set<string>>()
const packages = new Set<string>()
for (const [file, text] of textByFile) {
  for (const match of text.matchAll(imports)) {
    const specifier = match[1]!
    const local = resolveImport(file, specifier)
    if (local) {
      const importers = inbound.get(local) ?? new Set<string>()
      importers.add(file)
      inbound.set(local, importers)
      continue
    }
    if (
      specifier.startsWith('.') ||
      specifier.startsWith('/') ||
      specifier.startsWith('node:') ||
      specifier.startsWith('bun:')
    ) continue
    const packageName = specifier.startsWith('@')
      ? specifier.split('/').slice(0, 2).join('/')
      : specifier.split('/')[0]!
    packages.add(packageName)
  }
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
  dependencies?: Record<string, string>
  scripts?: Record<string, string>
  bin?: Record<string, string>
  exports?: Record<string, unknown>
}
const metadata = JSON.stringify({
  scripts: pkg.scripts ?? {},
  bin: pkg.bin ?? {},
  exports: pkg.exports ?? {},
})
const repositoryText = [...textByFile.values()].join('\n')
const unusedDependencies = Object.keys(pkg.dependencies ?? {})
  .filter(dependency =>
    !packages.has(dependency) &&
    !metadata.includes(dependency) &&
    !repositoryText.includes(dependency),
  )
  .sort()

const entrypoints = new Set([
  normalize(resolve('src/entrypoints/cli.tsx')),
  normalize(resolve('src/entrypoints/sdk.ts')),
])
const orphanedSources = files
  .filter(file => file.startsWith('src/'))
  .filter(file => !file.endsWith('.d.ts'))
  .filter(file => !file.includes('/generated/'))
  .filter(file => !file.includes('/test/fixtures/'))
  .filter(file => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file))
  .filter(file => !entrypoints.has(normalize(resolve(file))))
  .filter(file => !inbound.has(normalize(resolve(file))))
  .filter(file => !metadata.includes(file))
  .sort()

export const sourceImporters = Object.fromEntries(
  [...inbound.entries()].map(([target, importers]) => [
    normalize(target).replace(`${normalize(process.cwd())}/`, ''),
    [...importers]
      .map(importer => normalize(importer).replace(`${normalize(process.cwd())}/`, ''))
      .sort(),
  ]),
)

export const repoSizeReport = {
  scannedFiles: files.length,
  importedPackages: packages.size,
  unusedDependencies,
  orphanedSources,
}

if (import.meta.main) {
  console.log(JSON.stringify(repoSizeReport, null, 2))
}
