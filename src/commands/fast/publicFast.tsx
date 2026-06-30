import type * as React from 'react'
import type {
  LocalJSXCommandContext,
  LocalJSXCommandOnDone,
} from '../../types/command.js'
import {
  getFastModeUnavailableReason,
  isFastModeEnabled,
} from '../../utils/fastMode.js'
import { call as callFastMode } from './fast.js'

export async function call(
  onDone: LocalJSXCommandOnDone,
  context: LocalJSXCommandContext,
  args?: string,
): Promise<React.ReactNode | null> {
  if (!isFastModeEnabled()) {
    const reason =
      getFastModeUnavailableReason() ?? 'not supported in this session'
    onDone(`Fast mode unavailable: ${reason}`)
    return null
  }

  return callFastMode(onDone, context, args)
}
