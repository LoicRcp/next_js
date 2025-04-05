"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function AccordionDemo() {
  return (
    <div className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Hub FAQ</CardTitle>
          <CardDescription>Frequently asked questions about the Knowledge Hub</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>What is a Knowledge Graph?</AccordionTrigger>
              <AccordionContent>
                A knowledge graph is a network of entities, their semantic types, properties, and relationships. In our context, it helps organize and connect different pieces of information in your personal knowledge management system.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>How does the AI integration work?</AccordionTrigger>
              <AccordionContent>
                The AI system (Claude) analyzes your content, extracts entities and relationships, and helps organize information in the knowledge graph. It can also generate insights, answer questions based on your data, and suggest connections between different pieces of information.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>What external sources can be integrated?</AccordionTrigger>
              <AccordionContent>
                The system can integrate with Notion, Google Calendar, email services, and other productivity tools. This allows for a comprehensive view of your information ecosystem across different platforms.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>Is my data secure?</AccordionTrigger>
              <AccordionContent>
                Yes. Your data is stored in your own Neo4j database instance. The system uses secure API connections and proper authentication methods for all external services.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
