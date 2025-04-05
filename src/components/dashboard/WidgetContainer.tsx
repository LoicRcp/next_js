"use client";

import React, { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface WidgetContainerProps {
  id: string;
  title: string;
  children: ReactNode;
  onRemove?: (id: string) => void;
  className?: string;
}

export function WidgetContainer({ 
  id, 
  title, 
  children, 
  onRemove,
  className = "" 
}: WidgetContainerProps) {
  return (
    <div className={`h-full w-full ${className}`}>
      <Card className="h-full w-full">
        <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 cursor-move">
          <CardTitle className="text-md font-medium">{title}</CardTitle>
          {onRemove && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={() => onRemove(id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0 h-[calc(100%-48px)]">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
