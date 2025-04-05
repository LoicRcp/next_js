"use client";

import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { WidgetContainer } from './WidgetContainer';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

// Type pour un widget
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

// Type pour les définitions de widgets
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

interface DashboardProps {
  widgetRegistry: Record<string, WidgetDefinition>;
  availableWidgets: { type: string; title: string }[];
}

export function Dashboard({ widgetRegistry, availableWidgets }: DashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [width, setWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fonction pour ajuster la taille d'un widget en fonction de son contenu
  const updateWidgetMinSize = (widgetId: string, size: { width: number, height: number }) => {
    // Convertir les dimensions en pixel en taille de grille
    const pixelsPerCol = width / 12;
    const pixelsPerRow = 50; // rowHeight
    
    // Ajouter une légère marge pour éviter les barres de défilement
    const gridWidth = Math.min(Math.ceil((size.width + 20) / pixelsPerCol), 12); // Maximum de 12 colonnes
    const gridHeight = Math.ceil((size.height + 20) / pixelsPerRow);
    
    // Obtenir l'élément de layout actuel
    const currentItem = layout.find(item => item.i === widgetId);
    if (!currentItem) return;
    
    // Ne mettre à jour que si la taille calculée est supérieure à la taille actuelle
    if (gridWidth > currentItem.w || gridHeight > currentItem.h) {
      console.log(`Ajustement du widget ${widgetId}: ${currentItem.w}x${currentItem.h} -> ${gridWidth}x${gridHeight}`);
      
      // Mettre à jour le layout
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
    
    // Enregistrer les dimensions minimales dans le widget pour référence future
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

  // Observer pour la largeur du conteneur
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

  useEffect(() => {
    if (localStorage.getItem('dashboard-widgets')) {
      try {
        const savedWidgets = JSON.parse(localStorage.getItem('dashboard-widgets') || '[]');
        if (Array.isArray(savedWidgets) && savedWidgets.length > 0) {
          // Vérifier et corriger les dimensions trop petites
          const fixedWidgets = savedWidgets.map(widget => {
            if (widget.layout.w < 4) widget.layout.w = 4;
            if (widget.layout.h < 3) widget.layout.h = 3;
            return widget;
          });
          
          setWidgets(fixedWidgets);
          setLayout(fixedWidgets.map((widget: Widget) => ({
            i: widget.id,
            ...widget.layout
          })));
        }
      } catch (error) {
        console.error('Failed to load dashboard layout:', error);
      }
    }
  }, []);

  // Sauvegarde des widgets dans le localStorage
  useEffect(() => {
    if (widgets.length > 0) {
      localStorage.setItem('dashboard-widgets', JSON.stringify(widgets));
    }
  }, [widgets]);

  // Gestion du changement de layout lors du redimensionnement manuel
  const handleLayoutChange = (newLayout: Layout[]) => {
    // Vérifier si des widgets sont trop petits et les corriger
    const correctedLayout = newLayout.map(item => {
      // Récupérer le widget correspondant
      const widget = widgets.find(w => w.id === item.i);
      
      if (widget) {
        // Récupérer les dimensions minimales recommandées pour ce type de widget
        const widgetDef = widgetRegistry[widget.type];
        const minGridSize = widgetDef?.minGridSize || { w: 4, h: 3 };
        
        // Appliquer les contraintes de taille minimale
        return {
          ...item,
          w: Math.max(item.w, minGridSize.w),
          h: Math.max(item.h, minGridSize.h)
        };
      }
      
      // Conserver un minimum générique pour les widgets sans information spécifique
      return {
        ...item,
        w: Math.max(item.w, 4),
        h: Math.max(item.h, 3)
      };
    });
    
    setLayout(correctedLayout);
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

  // Ajout d'un nouveau widget
  const addWidget = (type: string) => {
    if (!widgetRegistry[type]) return;
    
    // Vérifier si le widget existe déjà pour éviter les doublons
    const existingWidgetType = widgets.some(w => w.type === type);
    
    if (existingWidgetType) {
      // Optionnel : notification à l'utilisateur qu'un widget du même type existe déjà
      console.log(`Un widget de type ${type} existe déjà`);
      return;
    }
    
    const title = availableWidgets.find(w => w.type === type)?.title || type;
    const id = `widget-${Date.now()}`;
    const { defaultSize } = widgetRegistry[type];
    
    // Trouver une position libre
    const y = Math.max(0, ...layout.map(item => item.y + item.h));
    
    // S'assurer que les dimensions ne sont pas trop petites
    const minWidth = 4;
    const minHeight = 3;
    
    // Utiliser les tailles minimales recommandées pour ce type de widget si disponibles
    const minGridSize = widgetRegistry[type].minGridSize || { w: minWidth, h: minHeight };
    
    const newWidget: Widget = {
      id,
      title,
      type,
      layout: {
        x: 0,
        y, // Placer en dessous des widgets existants
        w: Math.max(defaultSize.w, minGridSize.w),
        h: Math.max(defaultSize.h, minGridSize.h)
      },
      props: {}
    };
    
    setWidgets([...widgets, newWidget]);
  };

  // Suppression d'un widget
  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(widget => widget.id !== id));
  };

  return (
    <div className="p-4 w-full">
      <div className="mb-4 flex flex-wrap gap-2">
        {availableWidgets.map(({ type, title }) => (
          <Button 
            key={type}
            onClick={() => addWidget(type)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            {title}
          </Button>
        ))}
      </div>
      
      <div ref={containerRef} className="bg-muted/20 rounded-lg p-4 min-h-[600px]">
        {widgets.length > 0 ? (
          <GridLayout
            className="layout"
            layout={layout}
            cols={12}
            rowHeight={50}
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
              if (!WidgetComponent) return null;
              
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
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            Add widgets using the buttons above
          </div>
        )}
      </div>
    </div>
  );
}
