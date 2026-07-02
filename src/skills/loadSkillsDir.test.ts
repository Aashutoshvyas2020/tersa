import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'bun:test'

import { loadSkillsFromSkillsDir } from './loadSkillsDir.ts'

function writeSkill(rootDir: string, skillPath: string): void {
  const skillDir = join(rootDir, ...skillPath.split('/'))
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    `---\ndescription: ${skillPath}\n---\n# ${skillPath}\n`,
    'utf8',
  )
}

test('loads flat and nested skills with colon namespaces', async () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'tersa-skills-'))

  try {
    writeSkill(fixtureRoot, 'flat-skill')
    writeSkill(fixtureRoot, 'git/commit')
    writeSkill(fixtureRoot, 'frontend/react/form')

    const loaded = await loadSkillsFromSkillsDir(fixtureRoot, 'userSettings')
    const promptSkills = loaded
      .map(entry => entry.skill)
      .filter(
        (
          skill,
        ): skill is Extract<(typeof loaded)[number]['skill'], { type: 'prompt' }> & {
          skillRoot: string
        } => skill.type === 'prompt' && typeof skill.skillRoot === 'string',
      )
    const skillNames = promptSkills.map(skill => skill.name).sort()

    assert.deepEqual(skillNames, [
      'flat-skill',
      'frontend:react:form',
      'git:commit',
    ])

    const nestedSkill = promptSkills.find(skill => skill.name === 'git:commit')
    assert.ok(nestedSkill)
    assert.equal(nestedSkill.skillRoot, join(fixtureRoot, 'git', 'commit'))

    const deepSkill = promptSkills.find(
      skill => skill.name === 'frontend:react:form',
    )
    assert.ok(deepSkill)
    assert.equal(
      deepSkill.skillRoot,
      join(fixtureRoot, 'frontend', 'react', 'form'),
    )
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})
