"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export function AlertDemo() {
  return (
    <div className="space-y-4 h-full">
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>System Status</AlertTitle>
        <AlertDescription>
          Knowledge base synchronization complete. 152 new connections identified.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Attention Required</AlertTitle>
        <AlertDescription>
          Notion API connection lost. Please check your authentication token.
        </AlertDescription>
      </Alert>
    </div>
  )
}
