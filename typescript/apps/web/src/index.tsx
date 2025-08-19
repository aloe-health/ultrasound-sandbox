/**
 * Author: Nathaniel <nathaniel@aloe-health.tech>
 * Created: 2025-08-18
 * Purpose: Entry point for the ultrasound tools and simulation.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

const container = document.getElementById("root");
if (!container) throw new Error("Root container not found");
const root = createRoot(container);
root.render(<App />);
