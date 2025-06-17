"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, AlertTriangle, CheckCircle, Info } from "lucide-react"

/**
 * Composant AlertDemo - Widget d'exemple pour afficher les alertes système
 * 
 * Ce composant affiche un exemple d'alertes pertinentes pour le Knowledge Hub :
 * - État de synchronisation de la base de connaissances
 * - Problèmes de connexion aux services externes
 * - Informations sur les processus en cours
 * 
 * Utilisé comme widget de démonstration dans le dashboard.
 */
export function AlertDemo() {
  return (
    <div className="space-y-4 h-full overflow-auto p-2">
      {/* Alerte de succès - Synchronisation réussie */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Synchronisation Réussie
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Base de connaissances mise à jour. 152 nouvelles connexions identifiées.
        </AlertDescription>
      </Alert>

      {/* Alerte d'erreur - Problème de connexion */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Attention Requise</AlertTitle>
        <AlertDescription>
          Connexion API Notion perdue. Veuillez vérifier votre token d'authentification.
        </AlertDescription>
      </Alert>

      {/* Alerte informative - Processus en cours */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Traitement en Cours
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Analyse des nouvelles notes en cours. 5 éléments en file d'attente.
        </AlertDescription>
      </Alert>

      {/* Alerte système - Maintenance */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <Terminal className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Maintenance Programmée
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Optimisation du graphe prévue à 02:00. Aucun impact sur l'utilisation.
        </AlertDescription>
      </Alert>
    </div>
  )
}
