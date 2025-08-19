/* Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Main page component for the beamformer profile and simulation.
 */

import { useState, useEffect } from "react";
import AngleMagPlot from "../components/angle-mag-plot";
import BeamformProfileConfig from "../components/beamform-profile-config";
import { PatternPoint } from "@aloe/core";

export default function BeamformProfilePage() {
  const [pattern, setPattern] = useState<PatternPoint[]>([]);

  return (
    <div className="p-6">
      <header className="mb-5">
        <h1 className="text-2xl font-bold m-0">Phased Array Beamformer</h1>
        <p className="mt-2 text-gray-500">Configure elements, spacing, frequency, steering, window; edit weights; plot beam; export/import CSV.</p>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-[380px_1fr] gap-6">
        <BeamformProfileConfig setPattern={setPattern} />

        <AngleMagPlot plotHeight={"600px"} mode={"select-cartesian"} data={pattern} scalingConfig={{ mode: "db", range: [-70, "auto"] }} />
      </main>
    </div>
  );
}
