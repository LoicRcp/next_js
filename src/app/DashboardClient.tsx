"use client";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { widgetRegistry, availableWidgets } from "@/components/dashboard/widgets";

export function DashboardClient() {
  return (
    <div className="w-full">
      <Dashboard 
        widgetRegistry={widgetRegistry} 
        availableWidgets={availableWidgets} 
      />
    </div>
  );
}
