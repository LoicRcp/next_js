"use client";

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Données fictives pour le graphique
const data = [
  { name: 'Jan', knowledge: 400, insights: 240, connections: 100 },
  { name: 'Feb', knowledge: 430, insights: 280, connections: 120 },
  { name: 'Mar', knowledge: 450, insights: 310, connections: 150 },
  { name: 'Apr', knowledge: 470, insights: 350, connections: 180 },
  { name: 'May', knowledge: 540, insights: 400, connections: 220 },
  { name: 'Jun', knowledge: 580, insights: 450, connections: 250 },
  { name: 'Jul', knowledge: 620, insights: 480, connections: 280 },
];

export function ClientLineChart() {
  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Knowledge Growth</CardTitle>
        <CardDescription>Monthly progression of knowledge base items, insights and connections</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis 
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="knowledge" 
                stroke="var(--chart-1)" 
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="insights" 
                stroke="var(--chart-2)" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="connections" 
                stroke="var(--chart-3)" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
