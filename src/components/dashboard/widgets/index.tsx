"use client";

import { ClientLineChart } from "@/components/charts/ClientLineChart";
import { DataTable } from "@/components/demo/DataTable";
import { AlertDemo } from "@/components/demo/AlertDemo";
import { ProgressDemo } from "@/components/demo/ProgressDemo";
import { AccordionDemo } from "@/components/demo/AccordionDemo";
import { TabsDemo } from "@/components/demo/TabsDemo";
import { SizableWidgetWrapper } from "../SizableWidgetWrapper";
import React from "react";

// Créer des versions entourées de SizableWidgetWrapper pour chaque composant
const SizableChart = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <ClientLineChart />
  </SizableWidgetWrapper>
);

const SizableDataTable = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <DataTable />
  </SizableWidgetWrapper>
);

const SizableAlerts = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <AlertDemo />
  </SizableWidgetWrapper>
);

const SizableProgress = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <ProgressDemo />
  </SizableWidgetWrapper>
);

const SizableAccordion = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <AccordionDemo />
  </SizableWidgetWrapper>
);

const SizableTabs = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <TabsDemo />
  </SizableWidgetWrapper>
);

// Définitions des widgets pour le tableau de bord
export const widgetRegistry = {
  'chart': {
    component: SizableChart,
    defaultSize: { w: 8, h: 6 },
    // Estimation de la taille minimale utile pour ce type de widget
    minGridSize: { w: 5, h: 4 }
  },
  'data-table': {
    component: SizableDataTable,
    defaultSize: { w: 9, h: 7 },
    minGridSize: { w: 6, h: 5 }
  },
  'alerts': {
    component: SizableAlerts,
    defaultSize: { w: 8, h: 5 },
    minGridSize: { w: 5, h: 3 }
  },
  'progress': {
    component: SizableProgress,
    defaultSize: { w: 6, h: 6 },
    minGridSize: { w: 4, h: 4 }
  },
  'accordion': {
    component: SizableAccordion,
    defaultSize: { w: 8, h: 7 },
    minGridSize: { w: 5, h: 5 }
  },
  'tabs': {
    component: SizableTabs,
    defaultSize: { w: 10, h: 8 },
    minGridSize: { w: 6, h: 6 }
  }
};

// Liste des widgets disponibles pour l'ajout
export const availableWidgets = [
  { type: 'chart', title: 'Knowledge Growth Chart' },
  { type: 'data-table', title: 'Knowledge Base Data' },
  { type: 'alerts', title: 'System Alerts' },
  { type: 'progress', title: 'System Resources' },
  { type: 'accordion', title: 'Knowledge Hub FAQ' },
  { type: 'tabs', title: 'Dashboard Controls' }
];
