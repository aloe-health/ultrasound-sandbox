/**
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Routes for the ultrasound tools and simulation.
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainPage from "./main-page";
import BeamformProfilePage from "./beamform-profile-page";
import DynamicBeamformerPage from "./dynamic-beamformer-page";
import Shell from "../components/ui/shell";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route path="/" index element={<MainPage />} />
          <Route path="beamforming-profile" element={<BeamformProfilePage />} />
          <Route path="dynamic-beamforming" element={<DynamicBeamformerPage />} />
          <Route path="*" element={<MainPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}


