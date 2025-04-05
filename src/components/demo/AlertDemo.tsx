"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export function AlertDemo() {
  return (
    <div className="w-full max-w-4xl space-y-4">
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
