"use client";

import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { WidgetContainer } from './WidgetContainer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

/**
 * Interface pour un widget du dashboard
 */
export interface Widget {
  id: string;
  title: string;
  type: string;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  props?: Record<string, any>;
  minSize?: {
    width: number;
    height: number;
  };
}

/**
 * Interface pour les définitions de widgets du registre
 */
interface WidgetDefinition {
  component: React.ComponentType<any>;
  defaultSize: {
    w: number;
    h: number;
  };
  minGridSize?: {
    w: number;
    h: number;
  };
}

/**
 * Props du composant Dashboard
 */
interface DashboardProps {
  widgetRegistry: Record<string, WidgetDefinition>;
  availableWidgets: { type: string; title: string }[];
}

/**
 * Composant Dashboard - Système de gestion de widgets personnalisables
 * 
 * Ce composant fournit un tableau de bord interactif permettant :
 * - L'ajout/suppression de widgets
 * - Le glisser-déposer pour repositionner les widgets
 * - Le redimensionnement interactif
 * - La sauvegarde automatique de la configuration
 * - L'adaptation responsive
 * 
 * Utilise react-grid-layout pour la gestion de la grille interactive.
 * 
 * @param widgetRegistry - Catalogue des types de widgets disponibles
 * @param availableWidgets - Liste des widgets que l'utilisateur peut ajouter
 */
export function Dashboard({ widgetRegistry, availableWidgets }: DashboardProps) {
  // État des widgets actuellement affichés
  const [widgets, setWidgets] = useState<Widget[]>([]);
  // Layout pour react-grid-layout
  const [layout, setLayout] = useState<Layout[]>([]);
  // Largeur actuelle du conteneur (pour la responsivité)
  const [width, setWidth] = useState(1200);
  // Référence pour observer les changements de taille du conteneur
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Constantes pour le calcul des tailles
   */
  const GRID_COLS = 12;
  const ROW_HEIGHT = 50;
  const MIN_WIDGET_WIDTH = 4;
  const MIN_WIDGET_HEIGHT = 3;

  /**
   * Met à jour la taille minimale d'un widget en fonction de son contenu
   * 
   * Cette fonction est appelée par les widgets eux-mêmes pour informer
   * le dashboard de leur taille de contenu optimale. Elle ajuste
   * automatiquement la taille du widget si nécessaire.
   * 
   * @param widgetId - ID du widget à ajuster
   * @param size - Taille minimale requise en pixels
   */
  const updateWidgetMinSize = (widgetId: string, size: { width: number, height: number }) => {
    // Convertir les dimensions en pixel en taille de grille
    const pixelsPerCol = width / GRID_COLS;
    const pixelsPerRow = ROW_HEIGHT;
    
    // Ajouter une marge pour éviter les barres de défilement
    const gridWidth = Math.min(Math.ceil((size.width + 20) / pixelsPerCol), GRID_COLS);
    const gridHeight = Math.ceil((size.height + 20) / pixelsPerRow);
    
    // Obtenir l'élément de layout actuel
    const currentItem = layout.find(item => item.i === widgetId);
    if (!currentItem) return;
    
    // Mettre à jour seulement si la nouvelle taille est plus grande
    if (gridWidth > currentItem.w || gridHeight > currentItem.h) {
      console.log(`Ajustement du widget ${widgetId}: ${currentItem.w}x${currentItem.h} -> ${gridWidth}x${gridHeight}`);
      
      setLayout(layout.map(item => {
        if (item.i === widgetId) {
          return {
            ...item,
            w: Math.max(item.w, gridWidth),
            h: Math.max(item.h, gridHeight)
          };
        }
        return item;
      }));
    }
    
    // Enregistrer les dimensions minimales dans le widget
    setWidgets(widgets.map(widget => {
      if (widget.id === widgetId && !widget.minSize) {
        return {
          ...widget,
          minSize: size
        };
      }
      return widget;
    }));
  };

  /**
   * Observer pour la largeur du conteneur - gère la responsivité
   * 
   * Met à jour la largeur du dashboard quand la taille de la fenêtre change,
   * permettant à react-grid-layout de recalculer les positions.
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    // Initialiser la largeur
    updateWidth();

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  /**
   * Chargement de la configuration sauvegardée au montage du composant
   * 
   * Récupère la configuration des widgets depuis localStorage et
   * corrige automatiquement les tailles trop petites.
   */
  useEffect(() => {
    const savedConfig = localStorage.getItem('dashboard-widgets');
    if (savedConfig) {
      try {
        const savedWidgets = JSON.parse(savedConfig);
        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          // Corriger les dimensions trop petites
          const fixedWidgets = savedWidgets.map(widget => {
            if (widget.layout.w < MIN_WIDGET_WIDTH) widget.layout.w = MIN_WIDGET_WIDTH;
            if (widget.layout.h < MIN_WIDGET_HEIGHT) widget.layout.h = MIN_WIDGET_HEIGHT;
            return widget;
          });
          
          setWidgets(fixedWidgets);
          setLayout(fixedWidgets.map((widget: Widget) => ({
            i: widget.id,
            ...widget.layout
          })));
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration du dashboard:', error);
      }
    }
  }, []);

  /**
   * Sauvegarde automatique de la configuration dans localStorage
   */
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('dashboard-widgets', JSON.stringify(widgets));
    }
  }, [widgets]);

  /**
   * Gère les changements de layout lors du redimensionnement ou déplacement manuel
   * 
   * Applique les contraintes de taille minimale et met à jour l'état des widgets.
   * 
   * @param newLayout - Nouveau layout provenant de react-grid-layout
   */
  const handleLayoutChange = (newLayout: Layout[]) => {
    // Appliquer les contraintes de taille minimale
    const correctedLayout = newLayout.map(item => {
      const widget = widgets.find(w => w.id === item.i);
      
      if (widget) {
        // Récupérer les dimensions minimales recommandées
        const widgetDef = widgetRegistry[widget.type];
        const minGridSize = widgetDef?.minGridSize || { 
          w: MIN_WIDGET_WIDTH, 
          h: MIN_WIDGET_HEIGHT 
        };
        
        // Appliquer les contraintes
        return {
          ...item,
          w: Math.max(item.w, minGridSize.w),
          h: Math.max(item.h, minGridSize.h)
        };
      }
      
      // Minimum générique pour les widgets sans définition
      return {
        ...item,
        w: Math.max(item.w, MIN_WIDGET_WIDTH),
        h: Math.max(item.h, MIN_WIDGET_HEIGHT)
      };
    });
    
    setLayout(correctedLayout);
    
    // Synchroniser avec l'état des widgets
    setWidgets(widgets.map(widget => {
      const layoutItem = correctedLayout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    }));
  };

  /**
   * Ajoute un nouveau widget au dashboard
   * 
   * Vérifie la disponibilité du type, évite les doublons et positionne
   * automatiquement le nouveau widget.
   * 
   * @param type - Type de widget à ajouter (clé du widgetRegistry)
   */
  const addWidget = (type: string) => {
    if (!widgetRegistry[type]) {
      console.error(`Type de widget inconnu: ${type}`);
      return;
    }
    
    // Éviter les doublons pour les widgets uniques
    const existingWidgetType = widgets.some(w => w.type === type);
    if (existingWidgetType) {
      console.log(`Un widget de type ${type} existe déjà`);
      return;
    }
    
    // Récupérer les informations du widget
    const title = availableWidgets.find(w => w.type === type)?.title || type;
    const id = `widget-${Date.now()}`;
    const { defaultSize } = widgetRegistry[type];
    
    // Trouver une position libre (en dessous des widgets existants)
    const y = Math.max(0, ...layout.map(item => item.y + item.h));
    
    // Utiliser les tailles minimales recommandées
    const minGridSize = widgetRegistry[type].minGridSize || { 
      w: MIN_WIDGET_WIDTH, 
      h: MIN_WIDGET_HEIGHT 
    };
    
    const newWidget: Widget = {
      id,
      title,
      type,
      layout: {
        x: 0,
        y,
        w: Math.max(defaultSize.w, minGridSize.w),
        h: Math.max(defaultSize.h, minGridSize.h)
      },
      props: {}
    };
    
    setWidgets([...widgets, newWidget]);
  };

  /**
   * Supprime un widget du dashboard
   * 
   * @param id - ID du widget à supprimer
   */
  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(widget => widget.id !== id));
  };

  return (
    <div className="p-4 w-full">
      {/* Barre d'outils pour ajouter des widgets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {availableWidgets.map(({ type, title }) => (
          <Button 
            key={type}
            onClick={() => addWidget(type)}
            className="flex items-center gap-1"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            {title}
          </Button>
        ))}
      </div>
      
      {/* Zone principale du dashboard */}
      <div ref={containerRef} className="bg-muted/20 rounded-lg p-4 min-h-[600px]">
        {widgets.length > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={GRID_COLS}
            rowHeight={ROW_HEIGHT}
            width={width}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".cursor-move"
            resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
            compactType={null}
            margin={[8, 8]}
            containerPadding={[0, 0]}
          >
            {widgets.map(widget => {
              const WidgetComponent = widgetRegistry[widget.type]?.component;
              if (!WidgetComponent) {
                console.error(`Composant introuvable pour le widget: ${widget.type}`);
                return null;
              }
              
              return (
                <div key={widget.id} className="widget-container">
                  <WidgetContainer 
                    id={widget.id}
                    title={widget.title}
                    onRemove={removeWidget}
                  >
                    <WidgetComponent 
                      {...widget.props} 
                      onSizeChange={(size) => updateWidgetMinSize(widget.id, size)}
                    />
                  </WidgetContainer>
                </div>
              );
            })}
          </GridLayout>
        ) : (
          /* État vide - invitation à ajouter des widgets */
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Tableau de bord vide</h3>
              <p className="text-sm">Utilisez les boutons ci-dessus pour ajouter des widgets</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
