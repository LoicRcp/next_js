"use client";

import { Dashboard } from "@/components/dashboard/Dashboard";
import { widgetRegistry, availableWidgets } from "@/components/dashboard/widgets";

/**
 * Composant client pour le tableau de bord principal
 * 
 * Ce composant wrapp le Dashboard en mode client pour permettre
 * les interactions utilisateur (drag & drop, redimensionnement, etc.)
 * 
 * - widgetRegistry : Catalogue des widgets disponibles avec leur configuration
 * - availableWidgets : Liste des widgets que l'utilisateur peut ajouter
 */
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
