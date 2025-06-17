# Guide de Développement - Knowledge Hub Frontend

Ce guide explique l'organisation du code frontend et les bonnes pratiques pour contribuer au projet.

## 🏗️ Architecture du Frontend

### Structure des dossiers

```
src/
├── app/                      # Pages Next.js (App Router)
│   ├── api/chat/            # API endpoint pour les conversations IA
│   ├── chat/                # Page de l'interface de chat
│   ├── layout.tsx           # Layout racine de l'application
│   └── page.tsx             # Page d'accueil avec dashboard
├── components/              # Composants React réutilisables
│   ├── chat/                # Interface conversationnelle
│   ├── dashboard/           # Système de widgets
│   ├── demo/                # Widgets d'exemple
│   ├── status/              # Composants d'état système
│   ├── ui/                  # Composants UI de base (Shadcn)
│   └── index.ts             # Index des exports principaux
└── lib/                     # Utilitaires et logique métier
    ├── orchestration/       # Gestion multi-agents
    ├── reasoning/           # Wrapper de raisonnement IA
    └── utils/               # Fonctions utilitaires
```

## 🔧 Composants Principaux

### ChatInterface (`components/chat/`)

**Responsabilité** : Interface conversationnelle avec l'IA

**Architecture modulaire** :
- `ChatInterface.tsx` : Composant principal orchestrateur
- `components/MessageComponent.tsx` : Affichage d'un message
- `components/ChatInput.tsx` : Zone de saisie utilisateur
- `components/MessagesDisplay.tsx` : Liste des messages
- `components/MarkdownContent.tsx` : Rendu Markdown
- `components/ToolInvocationDisplay.tsx` : Affichage des appels d'outils

**Patterns utilisés** :
- React.memo pour optimiser les re-renders
- Hooks personnalisés pour la logique métier
- Vercel AI SDK pour la communication avec l'IA

### Dashboard (`components/dashboard/`)

**Responsabilité** : Système de widgets personnalisables

**Composants clés** :
- `Dashboard.tsx` : Orchestrateur principal avec react-grid-layout
- `WidgetContainer.tsx` : Wrapper pour tous les widgets
- `widgets/index.tsx` : Registre des widgets disponibles

**Fonctionnalités** :
- Drag & drop pour repositionner
- Redimensionnement interactif
- Sauvegarde automatique dans localStorage
- Gestion des tailles minimales

### SystemStatus (`components/status/`)

**Responsabilité** : Monitoring de l'état du système

**Fonctionnalités** :
- Vérification de la connexion Neo4j
- État du serveur MCP
- Interface adaptative selon l'état

## 🎨 Standards de Code

### Conventions TypeScript

```typescript
// ✅ Interface bien typée
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  isLoading?: boolean;
}

// ✅ Composant avec commentaires JSDoc
/**
 * Composant pour [description]
 * 
 * @param props - Les props du composant
 */
export function Component({ title, onAction, isLoading = false }: ComponentProps) {
  // ...
}

// ✅ Export nommé avec type explicite
export { Component } from './Component';
```

### Structure d'un composant

```typescript
"use client"; // Si nécessaire

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Documentation JSDoc complète
 */
interface Props {
  // Props typées
}

/**
 * Composant principal avec documentation
 */
export function MonComposant({ prop1, prop2 }: Props) {
  // 1. Hooks d'état
  const [state, setState] = useState(initialValue);
  
  // 2. Hooks d'effet
  useEffect(() => {
    // logique
  }, [dependencies]);
  
  // 3. Fonctions utilitaires
  const handleAction = () => {
    // logique
  };
  
  // 4. Rendu JSX avec commentaires si nécessaire
  return (
    <div className="classe-tailwind">
      {/* Commentaire explicatif si complexe */}
      <Button onClick={handleAction}>
        Action
      </Button>
    </div>
  );
}
```

### Gestion des styles

- **Tailwind CSS** : Classes utilitaires pour le styling
- **Shadcn/ui** : Composants de base pré-stylés
- **Responsive design** : Mobile-first avec breakpoints Tailwind
- **Dark mode** : Support natif avec classes `dark:`

## 📦 Widgets du Dashboard

### Créer un nouveau widget

1. **Créer le composant** dans `components/demo/` ou un dossier spécialisé
2. **Wrapper avec SizableWidgetWrapper** pour le redimensionnement
3. **Ajouter au registre** dans `components/dashboard/widgets/index.tsx`

```typescript
// Exemple de nouveau widget
const MonNouveauWidget = ({ onSizeChange }: any) => (
  <SizableWidgetWrapper onSizeChange={onSizeChange}>
    <MonComposantMetier />
  </SizableWidgetWrapper>
);

// Ajouter au registre
export const widgetRegistry = {
  // ... widgets existants
  'mon-widget': {
    component: MonNouveauWidget,
    defaultSize: { w: 6, h: 4 },
    minGridSize: { w: 4, h: 3 }
  }
};

export const availableWidgets = [
  // ... widgets existants
  { type: 'mon-widget', title: 'Mon Nouveau Widget' }
];
```

## 🔄 Intégration avec l'IA

### Communication avec le backend

- **Endpoint** : `/api/chat`
- **Protocol** : Vercel AI SDK avec streaming
- **Architecture** : Multi-agents côté backend, interface unifiée côté frontend

### Gestion des messages

```typescript
// Utilisation du hook useChat
const {
  messages,
  input,
  handleInputChange,
  handleSubmit,
  status,
  error
} = useChat({
  api: '/api/chat',
  maxSteps: 10,
  onFinish: (message) => {
    // callback de fin
  },
  onError: (error) => {
    // gestion d'erreur
  }
});
```

## 🧪 Tests et Qualité

### Linting

```bash
npm run lint  # ESLint pour la qualité du code
```

### Bonnes pratiques

- **Performance** : Utiliser React.memo pour les composants lourds
- **Accessibilité** : Attributes ARIA et navigation clavier
- **SEO** : Métadonnées appropriées avec Next.js
- **Sécurité** : Validation côté client ET serveur

## 🚀 Déploiement

### Build de production

```bash
npm run build  # Génération du build optimisé
npm run start  # Test du build de production
```

### Environnements

- **Development** : `npm run dev` avec hot reload
- **Production** : Build optimisé avec Next.js

---

Ce guide évolue avec le projet. N'hésitez pas à contribuer aux améliorations !
