"use client";

import { useState, useRef, useEffect } from 'react';

// Hook pour mesurer et retourner la taille minimale requise d'un composant
export function useMinimumSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [minSize, setMinSize] = useState({ width: 0, height: 0 });
  const [hasBeenMeasured, setHasBeenMeasured] = useState(false);

  useEffect(() => {
    if (!ref.current || hasBeenMeasured) return;

    // Fonction pour mesurer la taille du contenu
    const measureSize = () => {
      if (ref.current) {
        const { scrollWidth, scrollHeight } = ref.current;
        // Ne mettre à jour que si on a une mesure significative
        if (scrollWidth > 20 && scrollHeight > 20) {
          setMinSize({ 
            width: scrollWidth, 
            height: scrollHeight 
          });
          setHasBeenMeasured(true);
        }
      }
    };

    // Mesurer après un bref délai pour permettre au rendu de s'effectuer
    const timer = setTimeout(measureSize, 100);
    
    // Observer les redimensionnements (optionnel)
    const resizeObserver = new ResizeObserver(() => {
      if (!hasBeenMeasured) {
        measureSize();
      }
    });
    
    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [hasBeenMeasured]);

  return { ref, minSize };
}
