"use client";

import { ClientLineChart } from "@/components/charts/ClientLineChart";
import { DataTable } from "@/components/demo/DataTable";
import { AlertDemo } from "@/components/demo/AlertDemo";
import { ProgressDemo } from "@/components/demo/ProgressDemo";
import { AccordionDemo } from "@/components/demo/AccordionDemo";
import { TabsDemo } from "@/components/demo/TabsDemo";
import { SizableWidgetWrapper } from "../SizableWidgetWrapper";
import React from "react";

/**
 * Configuration des widgets du tableau de bord Knowledge Hub
 * 
 * Ce fichier définit tous les widgets disponibles pour le dashboard
 * avec leur configuration (taille par défaut, taille minimale, composant).
 * 
 * Chaque widget est encapsulé dans SizableWidgetWrapper pour permettre
 * le redimensionnement dans le dashboard.
 */

// Wrapper pour le graphique de croissance des connaissances
const SizableChart = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <ClientLineChart />
  </SizableWidgetWrapper>
);

// Wrapper pour la table de données des connaissances
const SizableDataTable = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <DataTable />
  </SizableWidgetWrapper>
);

// Wrapper pour les alertes système
const SizableAlerts = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <AlertDemo />
  </SizableWidgetWrapper>
);

// Wrapper pour l'état des ressources système
const SizableProgress = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <ProgressDemo />
  </SizableWidgetWrapper>
);

// Wrapper pour la FAQ Knowledge Hub
const SizableAccordion = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <AccordionDemo />
  </SizableWidgetWrapper>
);

// Wrapper pour les contrôles du dashboard
const SizableTabs = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <TabsDemo />
  </SizableWidgetWrapper>
);

/**
 * Registre des widgets disponibles pour le tableau de bord
 * 
 * Chaque widget a :
 * - component : Le composant React à rendre
 * - defaultSize : Taille par défaut (grille 12 colonnes)
 * - minGridSize : Taille minimale utile pour ce widget
 */
export const widgetRegistry = {
  'chart': {
    component: SizableChart,
    defaultSize: { w: 8, h: 6 },
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

/**
 * Liste des widgets disponibles pour l'ajout via l'interface utilisateur
 * 
 * Chaque élément définit :
 * - type : Clé correspondante dans widgetRegistry
 * - title : Nom affiché à l'utilisateur
 */
export const availableWidgets = [
  { type: 'chart', title: 'Graphique de Croissance des Connaissances' },
  { type: 'data-table', title: 'Données de la Base de Connaissances' },
  { type: 'alerts', title: 'Alertes Système' },
  { type: 'progress', title: 'Ressources Système' },
  { type: 'accordion', title: 'FAQ Knowledge Hub' },
  { type: 'tabs', title: 'Contrôles du Tableau de Bord' }
];
