'use client';

import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Données fictives pour le graphique
const data = [
  { name: 'Jan', value: 400 },
  { name: 'Feb', value: 430 },
  { name: 'Mar', value: 450 },
  { name: 'Apr', value: 470 },
  { name: 'May', value: 540 },
  { name: 'Jun', value: 580 },
  { name: 'Jul', value: 620 },
];

export function SimpleBarChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Récupération des couleurs du thème
    const chartColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--card-foreground').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border').trim();

    // Dimensions et marges
    const margin = { top: 40, right: 20, bottom: 50, left: 50 };
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;

    // Nettoyage du canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessin des axes
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, canvas.height - margin.bottom);
    ctx.lineTo(canvas.width - margin.right, canvas.height - margin.bottom);
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Grille horizontale
    const maxValue = Math.max(...data.map(d => d.value));
    const yScale = height / maxValue;
    
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + height - (height / 5) * i;
      const value = Math.round((maxValue / 5) * i);
      
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(canvas.width - margin.right, y);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      
      // Étiquettes Y
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(value.toString(), margin.left - 10, y + 4);
    }

    // Barres et étiquettes X
    const barWidth = width / data.length * 0.6;
    const barSpacing = width / data.length;
    
    data.forEach((item, index) => {
      const x = margin.left + barSpacing * index + barSpacing / 2 - barWidth / 2;
      const barHeight = item.value * yScale;
      const y = canvas.height - margin.bottom - barHeight;
      
      // Barre
      ctx.fillStyle = chartColor;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Étiquette X
      ctx.fillStyle = textColor;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.name, x + barWidth / 2, canvas.height - margin.bottom + 20);
      
      // Valeur au-dessus de la barre
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 10);
    });

  }, []);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Knowledge Growth</CardTitle>
        <CardDescription>Monthly progression of knowledge base items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <canvas 
            ref={canvasRef} 
            width={800