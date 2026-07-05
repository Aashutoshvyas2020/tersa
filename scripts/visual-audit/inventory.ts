import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

process.env.NODE_ENV ??= 'test'
process.env.TERSA_TUI_CANARY ??= '1'
process.env.TERSA_TUI_CANARY_PROVIDER ??= 'fixture'
process.env.CLAUDE_CODE_USE_OPENAI ??= '1'
process.env.OPENAI_API_KEY ??= 'visual-audit-fixture'
process.env.OPENGATEWAY_API_KEY ??= 'visual-audit-fixture'

const { enableConfigs } = await import('../../src/utils/config.ts')
const { DEFAULT_BINDINGS } = await import('../../src/keybindings/defaultBindings.ts')

enableConfigs()

const { getCommands, isSlashVisibleCommand } = await import('../../src/commands.ts')

function descriptionOf(command: Awaited<ReturnType<typeof getCommands>>[number]): string {
  const value = command.description
  return typeof value === 'function' ? value() : (value ?? '')
}

const commands = (await getCommands(process.cwd()))
  .filter(isSlashVisibleCommand)
  .map(command => ({
    name: command.name,
    aliases: command.aliases ?? [],
    type: command.type,
    description: descriptionOf(command),
    hidden: Boolean(command.isHidden),
    enabled: true,
    availability: command.availability ?? [],
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const keybindings = DEFAULT_BINDINGS.map(block => ({
  context: block.context,
  bindings: Object.entries(block.bindings).map(([key, action]) => ({ key, action })),
}))

const manifest = {
  generatedAt: new Date().toISOString(),
  commit: Bun.spawnSync(['git', 'rev-parse', 'HEAD']).stdout.toString().trim(),
  commands,
  keybindings,
}

const outputPath = resolve(process.argv[2] ?? 'artifacts/visual-audit/manifest.json')
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${commands.length} commands and ${keybindings.length} keybinding contexts to ${outputPath}`)
