import { DashboardClient } from "./DashboardClient";
import { SystemStatus } from "@/components/status/SystemStatus";
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

/**
 * Page d'accueil du Knowledge Hub
 * 
 * Cette page présente :
 * - Un titre et une description du système
 * - Le statut système en temps réel
 * - Un bouton d'accès au chat IA
 * - Le tableau de bord avec widgets configurables
 */
export default function Home() {
  return (
    <div className="grid items-center justify-items-center min-h-screen p-8 dark:bg-gray-950">
      <main className="flex flex-col gap-[32px] items-center">
        {/* En-tête principal */}
        <h1 className="text-3xl font-bold text-center">Knowledge Hub</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 max-w-md mb-4">
          Système centralisé de gestion des connaissances avec assistance IA
        </p>
        
        {/* Statut système */}
        <div className="w-full max-w-3xl mb-4">
          <SystemStatus />
        </div>
        
        {/* Bouton d'accès au chat */}
        <div className="flex justify-center mb-6">
          <Link 
            href="/chat" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ouvrir le chat IA
          </Link>
        </div>
        
        {/* Tableau de bord configuré */}
        <DashboardClient />
      </main>
    </div>
  );
}
