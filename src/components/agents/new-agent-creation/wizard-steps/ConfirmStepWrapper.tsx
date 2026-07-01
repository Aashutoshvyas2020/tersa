import chalk from 'chalk';
import React, { type ReactNode, useCallback, useState } from 'react';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from 'src/services/analytics/index.js';
import { useSetAppState } from 'src/state/AppState.js';
import type { Tools } from '../../../../Tool.js';
import type { AgentDefinition } from '../../../../tools/AgentTool/loadAgentsDir.js';
import { getActiveAgentsFromList } from '../../../../tools/AgentTool/loadAgentsDir.js';
import { editFileInEditor } from '../../../../utils/promptEditor.js';
import { useWizard } from '../../../wizard/index.js';
import { getNewAgentFilePath, saveAgentToFile } from '../../agentFileUtils.js';
import type { AgentWizardData } from '../types.js';
import { ConfirmStep } from './ConfirmStep.js';
type Props = {
  tools: Tools;
  existingAgents: AgentDefinition[];
  onComplete: (message: string) => void;
};
export function ConfirmStepWrapper({
  tools,
  existingAgents,
  onComplete
}: Props): ReactNode {
  const {
    wizardData
  } = useWizard<AgentWizardData>();
  const [saveError, setSaveError] = useState<string | null>(null);
  const setAppState = useSetAppState();
  const saveAgent = useCallback(async (openInEditor: boolean): Promise<void> => {
    const agent = wizardData.finalAgent;
    const location = wizardData.location;
    if (!agent || !location) return;
    try {
      await saveAgentToFile(location, agent.agentType, agent.whenToUse, agent.tools, agent.getSystemPrompt(), true, agent.color, agent.model, agent.memory);
      setAppState(state => {
        const allAgents = state.agentDefinitions.allAgents.concat(agent);
        return {
          ...state,
          agentDefinitions: {
            ...state.agentDefinitions,
            activeAgents: getActiveAgentsFromList(allAgents),
            allAgents
          }
        };
      });
      if (openInEditor) {
        const filePath = getNewAgentFilePath({
          source: location,
          agentType: agent.agentType
        });
        await editFileInEditor(filePath);
      }
      logEvent('tengu_agent_created', {
        agent_type: agent.agentType,
        generation_method: wizardData.wasGenerated ? 'generated' : 'manual',
        source: location,
        tool_count: agent.tools?.length ?? 'all',
        has_custom_model: !!agent.model,
        has_custom_color: !!agent.color,
        has_memory: !!agent.memory,
        memory_scope: agent.memory ?? 'none',
        ...(openInEditor ? {
          opened_in_editor: true
        } : {})
      } as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS);
      const message = openInEditor ? `Created agent: ${chalk.bold(agent.agentType)} and opened in editor. ` + `If you made edits, restart to load the latest version.` : `Created agent: ${chalk.bold(agent.agentType)}`;
      onComplete(message);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save agent');
    }
  }, [wizardData, onComplete, setAppState]);
  const handleSave = useCallback(() => saveAgent(false), [saveAgent]);
  const handleSaveAndEdit = useCallback(() => saveAgent(true), [saveAgent]);
  return <ConfirmStep tools={tools} existingAgents={existingAgents} onSave={handleSave} onSaveAndEdit={handleSaveAndEdit} error={saveError} />;
}
