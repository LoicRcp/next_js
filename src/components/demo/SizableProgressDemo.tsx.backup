"use client"

import { Progress } from "@/components/ui/progress"
import { useEffect } from "react"

interface SizableProgressDemoProps {
  onSizeChange?: (size: { width: number, height: number }) => void;
}

export function SizableProgressDemo({ onSizeChange }: SizableProgressDemoProps) {
  // Au rendu, mesurer la taille et la communiquer au parent
  useEffect(() => {
    // Les dimensions dont ce composant a besoin pour s'afficher correctement
    if (onSizeChange) {
      onSizeChange({ width: 300, height: 180 });
    }
  }, [onSizeChange]);
  
  return (
    <div className="space-y-4 h-full w-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Graph Database</span>
          <span className="text-sm text-muted-foreground">65%</span>
        </div>
        <Progress value={65} className="h-2" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">API Quota</span>
          <span className="text-sm text-muted-foreground">28%</span>
        </div>
        <Progress value={28} className="h-2" />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Knowledge Indexing</span>
          <span className="text-sm text-muted-foreground">92%</span>
        </div>
        <Progress value={92} className="h-2" />
      </div>
    </div>
  )
}
