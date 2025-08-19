/* Author: Nathaniel &lt;nathaniel@aloe-health.tech&gt;
 * Created: 2025-08-18
 * Purpose: Web implementation of StoragePort using browser downloads.
 */

import { StoragePort } from "@aloe/core";

export class WebStorage implements StoragePort {
  async saveText(fileName: string, content: string): Promise<void> {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async loadText(filePath: string): Promise<string | null> {
    throw new Error("Load not supported in web environment");
  }
}
