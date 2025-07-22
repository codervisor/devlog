/**
 * Integration service that handles synchronization between local storage and external systems
 */

import { DevlogEntry, ConflictData, SyncStatus } from '../types/index.js';

export class IntegrationService {
  private backgroundSyncTimer?: NodeJS.Timeout;

  /**
   * Stop background synchronization
   */
  stopBackgroundSync(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = undefined;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopBackgroundSync();
  }
}
