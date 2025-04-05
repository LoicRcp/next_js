"use client";

import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { DataTable } from "@/components/demo/DataTable";
import { AlertDemo } from "@/components/demo/AlertDemo";
import { ProgressDemo } from "@/components/demo/ProgressDemo";
import { AccordionDemo } from "@/components/demo/AccordionDemo";
import { TabsDemo } from "@/components/demo/TabsDemo";

export function DashboardClient() {
  return (
    <div className="w-full max-w-4xl space-y-10">
      <ChartWrapper />
      <AlertDemo />
      <ProgressDemo />
      <DataTable />
      <AccordionDemo />
      <TabsDemo />
    </div>
  );
}
