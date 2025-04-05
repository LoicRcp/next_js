"use client";

import React, { useRef, useEffect, useState } from 'react';

interface SizableWidgetWrapperProps {
  onSizeChange?: (size: { width: number, height: number }) => void;
  children: React.ReactNode;
}

export function SizableWidgetWrapper({ onSizeChange, children }: SizableWidgetWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const sizeReported = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!ref.current || !isMounted || !onSizeChange) return;

    // Fonction pour mesurer la taille du contenu - une seule fois
    const measureSize = () => {
      if (ref.current && !sizeReported.current) {
        const el = ref.current;
        
        // Calculer les dimensions de base
        const contentWidth = Math.max(el.scrollWidth, 300);
        const contentHeight = Math.max(el.scrollHeight, 200);
        
        // Rapporter la taille une seule fois
        onSizeChange({ 
          width: contentWidth,
          height: contentHeight
        });
        
        sizeReported.current = true;
      }
    };

    // Mesurer après un délai pour laisser le rendu s'effectuer
    const timer = setTimeout(measureSize, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [isMounted, onSizeChange]);

  return (
    <div ref={ref} className="h-full w-full" style={{ visibility: isMounted ? 'visible' : 'hidden' }}>
      {children}
    </div>
  );
}
