"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ProgressDemo() {
  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>System Resources</CardTitle>
          <CardDescription>Current usage metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  )
}
