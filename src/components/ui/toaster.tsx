'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
        className: "!bg-background !border-border !text-foreground !shadow-md",
        descriptionClassName: "!text-muted-foreground",
      }}
    />
  );
}
