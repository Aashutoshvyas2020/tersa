import * as React from 'react';
import type { Notification } from '../context/notifications.js';
import { Text } from '../ink.js';
import { logForDebugging } from '../utils/debug.js';
import { checkAndInstallOfficialMarketplace } from '../utils/plugins/officialMarketplaceStartupCheck.js';
import { useStartupNotification } from './notifs/useStartupNotification.js';

/**
 * Hook that handles official marketplace auto-installation and shows
 * notifications for success/failure in the bottom right of the REPL.
 */
export function useOfficialMarketplaceNotification() {
  useStartupNotification(_temp);
}
async function _temp() {
  const result = await checkAndInstallOfficialMarketplace();
  const notifs: Notification[] = [];
  if (result.configSaveFailed) {
    logForDebugging("Showing marketplace config save failure notification");
    notifs.push({
      key: "marketplace-config-save-failed",
      jsx: <Text color="error">Failed to save marketplace retry info · Check ~/.tersa.json permissions</Text>,
      priority: "immediate",
      timeoutMs: 10000
    });
  }
  if (result.installed) {
    logForDebugging("Plugin marketplace installed without a startup notification");
  } else if (result.skipped && result.reason === "unknown") {
    logForDebugging("Showing marketplace installation failure notification");
    notifs.push({
      key: "marketplace-install-failed",
      jsx: <Text color="warning">Plugin marketplace setup failed · Will retry on next startup</Text>,
      priority: "immediate",
      timeoutMs: 8000
    });
  }
  return notifs;
}
