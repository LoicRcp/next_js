import ChatInterface from '@/components/chat/ChatInterface';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Chat avec IA | Knowledge Hub',
  description: 'Posez vos questions et gérez vos connaissances avec l\'assistant IA.',
};

export default function ChatPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b p-4 flex items-center gap-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Knowledge Hub Chat</h1>
          <p className="text-sm text-muted-foreground">Interagissez avec votre assistant IA</p>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
