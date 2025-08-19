/*
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Defines the storage port interface for the beamformer application.
 */

export interface StoragePort {
  /** Save text by a key or path (node can use file path, web can use key+download). */
  saveText(name: string, content: string): Promise<void>;
  /** Load text by a key or path (node reads file path, web uses localStorage key). */
  loadText(name: string): Promise<string | null>;
}
