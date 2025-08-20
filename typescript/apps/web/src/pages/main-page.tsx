/**
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Main navigation page for the ultrasound tools and simulation.
 */

import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export default function MainPage() {
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Ultrasound Tools and Simulation</h1>
        <p className="text-muted-foreground mt-1">Main navigation page — choose an app.</p>
      </header>
      <main>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Pages</h2>
            <ul className="mt-2 space-y-2">
              <li>
                <Link className="text-indigo-600" to="/beamforming-profile">Beamforming profile</Link>
              </li>
              <li>
                <Link className="text-indigo-600" to="/dynamic-beamforming">Dynamic beamforming</Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}


