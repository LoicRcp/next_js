// next_js/src/app/api/chat/route.ts
import { google } from '@ai-sdk/google';
import {
  streamText,
  tool,
  type CoreMessage,
  type Tool,
  type ToolCall, // Gardé au cas où, mais moins utilisé directement ici
  type ToolExecutionOptions, // Gardé au cas où
} from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';
// NE PLUS IMPORTER getMcpClient ici, car l'orchestrateur ne l'utilise pas directement
// import { getMcpClient } from '@/lib/mcp-client';
// Importer les fonctions d'appel des agents spécialisés
import { executeReaderAgentCall, executeIntegratorAgentCall } from '@/lib/agent-caller';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const geminiModelId = process.env.GEMINI_MODEL_ID || 'gemini-1.5-flash';
const googleApiKeyEnvVar = 'GOOGLE_GENERATIVE_AI_API_KEY';

if (!process.env[googleApiKeyEnvVar]) {
  console.warn(`\n[Startup Warning] Environment variable ${googleApiKeyEnvVar} is not set. Google AI calls might fail.`);
}

// --- Prompt Système de l'Agent Orchestrateur ---
// (Utilise le prompt complet de Obsidian/Prompts/Agent Orchestrateur.md)

const ORCHESTRATOR_SYSTEM_PROMPT = fs.readFileSync(
  path.resolve(
    process.cwd(),
    '..',
    'docs',
    'KnowledgeHub',
    'Obsidian',
    'Prompts',
    'Agent Orchestrateur.md'
  ),
  'utf-8'
);

// --- Schémas Zod pour les OUTILS DE L'ORCHESTRATEUR ---
// Ces outils appellent les fonctions dans agent-caller.ts

const callReaderAgentSchema = z.object({
  taskDescription: z.string().describe("Description claire et détaillée de la tâche de lecture ou de recherche à effectuer par l'Agent Lecteur."),
  // Ajoute d'autres champs si l'Orchestrateur doit passer plus de contexte
});

const callIntegratorAgentSchema = z.object({
  taskDescription: z.string().describe("Description claire et détaillée de la tâche d'intégration (création ou modification de données) à effectuer par l'Agent Intégrateur."),
  // Ajoute d'autres champs si l'Orchestrateur doit passer plus de contexte
});

// TODO: Ajouter les schémas pour callRestructuratorAgent et callExternalAgent si nécessaire


// --- Route Handler POST (Logique principale) ---
export async function POST(req: Request) {
  try {
    console.log("\n--- [API Route] Received POST request ---");

    const { messages, chatId }: { messages: CoreMessage[], chatId?: string } = await req.json();
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }
    const integrationBatchId = chatId ? `batch_${chatId}_${Date.now()}` : undefined;

    // --- Création de l'objet 'availableTools' pour l'ORCHESTRATEUR ---
    // Déplacé ici pour avoir accès à integrationBatchId et chatId
    const availableTools: Record<string, Tool<any, any>> = {
      callReaderAgent: tool({
        description: "Délègue une tâche de lecture ou de recherche d'informations dans le graphe de connaissances à l'Agent Lecteur spécialisé.",
        parameters: callReaderAgentSchema,
        execute: async (args) => {
          console.log(`[Orchestrator Tool] Calling executeReaderAgentCall with:`, args);
          // Appelle la fonction importée depuis agent-caller.ts
          const result = await executeReaderAgentCall({
            ...args,
            integrationBatchId: integrationBatchId,
            chatId: chatId
          });
          console.log(`[Orchestrator Tool] Result from executeReaderAgentCall:`, result);
          return result;
        }
      }),
      callIntegratorAgent: tool({
        description: "Délègue une tâche de création ou de modification d'informations (préparation pour intégration) dans le graphe de connaissances à l'Agent Intégrateur spécialisé.",
        parameters: callIntegratorAgentSchema,
        execute: async (args) => {
          console.log(`[Orchestrator Tool] Calling executeIntegratorAgentCall with:`, args);
          const result = await executeIntegratorAgentCall({
            ...args,
            integrationBatchId: integrationBatchId,
            chatId: chatId
          });
          console.log(`[Orchestrator Tool] Result from executeIntegratorAgentCall:`, result);
          return result;
        }
      }),
      // TODO: Ajouter les outils callRestructuratorAgent et callExternalAgent ici
    };

    console.log(`[API Route] Processing ${messages.length} messages for Orchestrator.`);

    // Pas besoin de vérifier le client MCP ici directement

    console.log(`[API Route] Calling Google AI model '${geminiModelId}' for Orchestrator...`);
    const result = await streamText({
      model: google(geminiModelId),
      system: ORCHESTRATOR_SYSTEM_PROMPT, // Utiliser le prompt de l'Orchestrateur
      messages,
      tools: availableTools, // Utiliser les outils de délégation

      onFinish: ({ finishReason, usage }) => {
          console.log(`[API Route - Orchestrator] Stream finished. Reason: ${finishReason}`);
          console.log(`[API Route - Orchestrator] Token Usage: Input=${usage.promptTokens}, Output=${usage.completionTokens}, Total=${usage.totalTokens}`);
      },
      onError: (error) => {
         console.error("[API Route - Orchestrator] Error during streamText processing:", error);
      }
    });

    console.log("[API Route] Streaming Orchestrator response back to client...");
    return result.toDataStreamResponse();

  } catch (error: any) {
    console.error(`[API Route Error - ${new Date().toISOString()}] Unhandled Error in Orchestrator route:`);
    console.error("  Message:", error.message);
    if (process.env.NODE_ENV !== 'production') {
        console.error("  Stack:", error.stack);
    } else {
         console.error("  (Stack trace hidden in production)");
    }
    // L'erreur peut provenir de l'appel à executeReader/IntegratorAgentCall
    const detail = error.message || "An internal server error occurred.";

    return NextResponse.json(
      { error: "An internal server error occurred.", details: detail },
      { status: 500, statusText: "Internal Server Error" }
    );
  }
}