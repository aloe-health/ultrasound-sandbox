/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Node.js implementation of the StoragePort for file system operations.
 */

import { StoragePort } from "@aloe/core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";

export class NodeStorage implements StoragePort {
  async saveText(filePath: string, content: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf8");
  }
  async loadText(filePath: string): Promise<string | null> {
    try {
      const buf = await readFile(filePath);
      return buf.toString("utf8");
    } catch {
      return null;
    }
  }
}
