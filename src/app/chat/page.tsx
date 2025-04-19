import ChatInterface from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

// Métadonnées pour la page (SEO et titre de l'onglet)
export const metadata: Metadata = {
  title: 'Chat IA | Knowledge Hub',
  description: 'Interagissez avec votre assistant IA pour explorer et gérer vos connaissances.',
};

// Le composant Page pour la route /chat
export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* En-tête de la page de chat */}
      <header className="border-b border-border p-3 md:p-4 flex items-center gap-3 sticky top-0 bg-background z-10">
        {/* Bouton de retour vers la page d'accueil */}
        <Link href="/" legacyBehavior>
          <a aria-label="Retour au tableau de bord">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </a>
        </Link>
        {/* Titre de la page */}
        <div>
          <h1 className="text-lg font-semibold leading-none">
            Assistant Knowledge Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Posez des questions, ajoutez des notes, explorez vos liens...
          </p>
        </div>
      </header>

      {/* Conteneur principal pour l'interface de chat */}
      {/* 'flex-1' permet à cette section de prendre toute la hauteur restante */}
      {/* 'overflow-hidden' empêche le double défilement */}
      <main className="flex-1 overflow-hidden">
        {/* Intégration du composant ChatInterface */}
        {/* Il gérera son propre défilement interne */}
        <ChatInterface />
      </main>
    </div>
  );
}
