"use client"

import { Progress } from "@/components/ui/progress"

export function ProgressDemo() {
  return (
    <div className="space-y-4 h-full">
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
