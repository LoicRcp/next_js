"use client";

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Info } from 'lucide-react';

export function SystemStatus() {
  const [status, setStatus] = useState<any>({ loading: true });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/mcp-ping?details=true');
      const data = await response.json();
      setStatus({ ...data, loading: false });
    } catch (error: any) {
      setStatus({ error: error.message, loading: false });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (status.loading) {
    return (
      <div className="rounded-lg border p-4 flex items-center gap-2 bg-muted/50">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        <span>Vérification de l'état du système...</span>
      </div>
    );
  }

  if (status.error) {
    return (
      <div className="rounded-lg border p-4 bg-destructive/10 text-destructive flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <p className="font-medium">Erreur de connexion</p>
          <p className="text-sm">Impossible de contacter le serveur MCP</p>
        </div>
        <button 
          onClick={checkStatus} 
          className="ml-auto bg-background hover:bg-muted p-1.5 rounded"
          aria-label="Rafraîchir"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  const isOk = status.result?.status?.neo4j?.connected;

  return (
    <div className={`rounded-lg border p-4 ${isOk ? 'bg-green-100 dark:bg-green-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOk ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="font-medium">{isOk ? 'Système opérationnel' : 'Système en mode limité'}</p>
            <p className="text-sm">
              Neo4j: {isOk ? 'Connecté' : 'Non connecté'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const detailText = status.result?.content?.[0]?.text || 'Aucun détail disponible';
              alert(detailText);
            }}
            className="bg-background hover:bg-muted p-1.5 rounded"
            aria-label="Détails"
          >
            <Info className="h-4 w-4" />
          </button>
          <button 
            onClick={checkStatus} 
            className="bg-background hover:bg-muted p-1.5 rounded"
            aria-label="Rafraîchir"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
