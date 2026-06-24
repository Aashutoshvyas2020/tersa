import * as React from 'react';
import { Settings } from '../../components/Settings/Settings.js';
import { Stats } from '../../components/Stats.js';
import type { LocalJSXCommandCall } from '../../types/command.js';
import { call as costCall } from '../cost/cost.js';
export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const mode = args.trim().toLowerCase();
  if (mode === 'stats') {
    return <Stats onClose={onDone} />;
  }
  if (mode === 'cost') {
    const result = await costCall('', context);
    onDone(result.type === 'text' ? result.value : '', { display: 'system' });
    return null;
  }
  if (mode && mode !== 'limits') {
    onDone('Usage options: /usage, /usage cost, /usage stats', { display: 'system' });
    return null;
  }
  return <Settings onClose={onDone} context={context} defaultTab="Usage" />;
};
