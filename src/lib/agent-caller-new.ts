// --- Nouvelles Fonctions d'Exécution des Agents (avec workflow Read-Before-Write) ---

/**
 * Exécute une recherche simple via l'Agent Lecteur
 */
export async function executeSearch(args: SearchArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Search with query:", args.query);
  try {
    // Préparer la taskDescription pour l'Agent Lecteur
    const taskDescription = `Recherche dans le graphe de connaissances : ${args.query}

Effectue une recherche complète pour répondre à cette requête. Utilise les outils appropriés (searchWithContext, findNodes, getNodeDetails) pour trouver toutes les informations pertinentes.

Si des nœuds avec integrationStatus='pending' existent et sont pertinents, inclus-les dans ta recherche en utilisant includePending:true.`;

    const messages: CoreMessage[] = [{ role: 'user', content: taskDescription }];
    
    console.log("[Agent Caller] Calling Reader LLM for search...");
    const { text, toolResults, finishReason, usage } = await generateText({
      model: google(geminiModelId),
      system: READER_SYSTEM_PROMPT,
      messages: messages,
      tools: readerTools,
      maxSteps: 100,
      onStepFinish: async (stepResult) => {
        const toolResults = stepResult.toolResults as Array<{ toolName: string; args: any; result: any }> | undefined;
        if (toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            console.log(`[Reader Agent][Step] Tool used: ${toolResult.toolName}`);
          }
        }
      },
    });
    
    console.log("[Reader Agent] Raw response:", text);
    
    // Parser la réponse JSON du Lecteur
    try {
      const parsedResult = JSON.parse(text);
      if (!parsedResult.success) {
        return {
          success: false,
          error: parsedResult.error || "Erreur dans la recherche",
          summary_text: parsedResult.summary_text
        };
      }
      
      return {
        success: true,
        data: parsedResult.result,
        summary_text: parsedResult.result?.summary_text || "Recherche effectuée"
      };
    } catch (parseError) {
      // Si le parsing échoue, retourner le texte brut
      return {
        success: true,
        summary_text: text || "Recherche effectuée"
      };
    }
  } catch (error: any) {
    console.error("[Agent Caller] Error executing search:", error);
    return {
      success: false,
      error: `Erreur lors de la recherche: ${error.message}`
    };
  }
}

/**
 * Exécute l'ajout ou la mise à jour d'informations avec workflow Read-Before-Write
 */
export async function executeAddOrUpdate(args: AddOrUpdateArgs): Promise<AgentCallResult> {
  console.log("[Agent Caller] Executing Add/Update with information:", args.information);
  
  try {
    // ÉTAPE 1 : READ - Vérifier l'existence des entités via l'Agent Lecteur
    console.log("[Agent Caller] Step 1: Checking existing entities...");
    
    const readTaskDescription = `Analyse cette information et vérifie si les entités principales existent déjà dans le graphe :

"${args.information}"

Recherche spécifiquement :
1. Les projets mentionnés
2. Les personnes nommées
3. Les organisations citées
4. Les concepts clés

Pour chaque entité trouvée, fournis son ID unique. Indique clairement ce qui existe déjà et ce qui n'existe pas.
N'oublie pas de vérifier aussi les nœuds avec integrationStatus='pending' en utilisant includePending:true.`;

    const readMessages: CoreMessage[] = [{ role: 'user', content: readTaskDescription }];
    
    const { text: readText } = await generateText({
      model: google(geminiModelId),
      system: READER_SYSTEM_PROMPT,
      messages: readMessages,
      tools: readerTools,
      maxSteps: 100
    });
    
    console.log("[Agent Caller] Reader analysis result:", readText);
    
    // ÉTAPE 2 : WRITE - Utiliser l'Agent Intégrateur avec le contexte du Lecteur
    console.log("[Agent Caller] Step 2: Writing/updating with context...");
    
    // Vérifier si des données existent déjà pour ce batch
    let hasExistingPendingData = false;
    let lastSummary = '';
    
    if (args.integrationBatchId) {
      const checkResult = await checkExistingPendingData(args.integrationBatchId);
      hasExistingPendingData = checkResult.hasData;
      
      if (hasExistingPendingData) {
        lastSummary = await getBatchSummary(args.integrationBatchId);
      }
    }
    
    const writeTaskDescription = `Intègre cette information dans le graphe :

"${args.information}"

Contexte de l'analyse préalable :
${readText}

Instructions :
- Pour les entités qui existent déjà (avec leurs IDs fournis ci-dessus), utilise ces IDs pour créer les liens appropriés
- Pour les entités qui n'existent pas, crée-les
- Assure-toi de créer une structure cohérente avec toutes les relations nécessaires
${hasExistingPendingData ? `- Des données existent déjà dans ce batch. Résumé précédent : ${lastSummary}` : ''}`;

    const integratorMessages: CoreMessage[] = [{ role: 'user', content: writeTaskDescription }];
    
    const { text: writeText } = await generateText({
      model: google(geminiModelId),
      system: hasExistingPendingData ? INTEGRATOR_SYSTEM_PROMPT_B : INTEGRATOR_SYSTEM_PROMPT_A,
      messages: integratorMessages,
      tools: integratorTools,
      maxSteps: 100,
      onStepFinish: async (stepResult) => {
        const toolResults = stepResult.toolResults as Array<{ toolName: string; args: any; result: any }> | undefined;
        if (toolResults && toolResults.length > 0) {
          for (const toolResult of toolResults) {
            console.log(`[Integrator Agent][Step] Tool used: ${toolResult.toolName}`);
          }
        }
      },
    });
    
    console.log("[Agent Caller] Integrator result:", writeText);
    
    // Parser et traiter la réponse de l'Intégrateur
    try {
      const parsedResult = JSON.parse(writeText);
      
      if (!parsedResult.success) {
        return {
          success: false,
          error: parsedResult.error || "Erreur lors de l'intégration",
          summary_text: parsedResult.newSummary
        };
      }
      
      // Post-traitement : marquer les nœuds avec integrationStatus et integrationBatchId
      if (args.integrationBatchId && parsedResult.batchOperations?.nodesCreated) {
        const nodeIds = parsedResult.batchOperations.nodesCreated.map((n: any) => n.id);
        
        // Ajouter les propriétés de batch à tous les nœuds créés
        for (const nodeId of nodeIds) {
          if (nodeId) {
            await executeMcpToolForAgent('updateNodeProperties', {
              nodeQuery: JSON.stringify({ id: nodeId }),
              properties: JSON.stringify({
                integrationStatus: 'pending',
                integrationBatchId: args.integrationBatchId
              }),
              operation: 'set'
            });
          }
        }
        
        // Créer ou mettre à jour le nœud IntegrationBatch
        const isNewBatch = !hasExistingPendingData;
        
        if (isNewBatch) {
          await executeMcpToolForAgent('createNode', {
            label: 'IntegrationBatch',
            properties: JSON.stringify({
              batchId: args.integrationBatchId,
              status: 'pending',
              lastSummary: parsedResult.newSummary || '',
              createdAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
              conversationId: args.chatId
            })
          });
        } else {
          await executeMcpToolForAgent('updateNodeProperties', {
            nodeQuery: JSON.stringify({ 
              label: 'IntegrationBatch',
              property: 'batchId',
              value: args.integrationBatchId 
            }),
            properties: JSON.stringify({
              lastSummary: parsedResult.newSummary || '',
              lastUpdatedAt: new Date().toISOString()
            }),
            operation: 'set'
          });
        }
      }
      
      return {
        success: true,
        data: {
          readAnalysis: readText,
          integrationResult: parsedResult,
          integrationBatchId: args.integrationBatchId
        },
        summary_text: parsedResult.newSummary || "Information intégrée avec succès"
      };
      
    } catch (parseError: any) {
      console.error("[Agent Caller] Failed to parse integrator response:", parseError);
      return {
        success: false,
        error: `Erreur de traitement: ${parseError.message}`,
        summary_text: writeText || "Erreur lors de l'intégration"
      };
    }
    
  } catch (error: any) {
    console.error("[Agent Caller] Error executing add/update:", error);
    return {
      success: false,
      error: `Erreur lors de l'ajout/mise à jour: ${error.message}`
    };
  }
}

// TODO: Ajouter la fonction pour l'Agent Restructurateur (asynchrone)
// export async function executeRestructuratorCycle() { ... }
