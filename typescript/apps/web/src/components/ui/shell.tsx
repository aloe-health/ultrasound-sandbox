import React from "react";
import Breadcrumbs from "./breadcrumbs";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function Shell() {
    
  return (
    <div className="min-h-screen bg-gray-50">

      <main className="p-6">
        <Breadcrumbs />
        <div className="bg-white rounded-lg shadow-sm">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


