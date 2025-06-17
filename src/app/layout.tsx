import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/**
 * Configuration des polices Google Fonts
 * Geist : Police principale pour le contenu
 * Geist Mono : Police monospace pour le code
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Hub - Gestionnaire de Connaissances IA",
  description: "Système avancé de gestion des connaissances avec assistance IA multi-agents. Explorez, connectez et enrichissez vos informations.",
};

/**
 * Layout racine de l'application Knowledge Hub
 * 
 * Ce composant définit la structure HTML de base pour toutes les pages :
 * - Configuration des polices personnalisées
 * - Mode sombre par défaut
 * - Composant Toaster pour les notifications
 * 
 * @param children - Les composants de page à rendre
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Composant pour afficher les notifications toast */}
        <Toaster />
      </body>
    </html>
  );
}
