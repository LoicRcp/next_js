import { DashboardClient } from "./DashboardClient";
import { SystemStatus } from "@/components/status/SystemStatus";
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="grid items-center justify-items-center min-h-screen p-8 dark:bg-gray-950">
      <main className="flex flex-col gap-[32px] items-center">
        <h1 className="text-3xl font-bold text-center">Knowledge Hub</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 max-w-md mb-4">
          Centralized knowledge management system with AI assistance
        </p>
        
        <div className="w-full max-w-3xl mb-4">
          <SystemStatus />
        </div>
        
        <div className="flex justify-center mb-6">
          <Link 
            href="/chat" 
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ouvrir le chat IA
          </Link>
        </div>
        
        <DashboardClient />
      </main>
    </div>
  );
}
