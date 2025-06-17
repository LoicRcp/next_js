# Knowledge Hub - Gestionnaire de Connaissances IA 🧠

## Vue d'ensemble

Knowledge Hub est un système avancé de gestion des connaissances personnelles qui révolutionne la façon dont vous stockez, organisez et explorez vos informations. Contrairement aux outils traditionnels qui traitent les données de manière isolée, Knowledge Hub utilise une **architecture multi-agents IA** et une **base de données graphe** pour créer un écosystème de connaissances véritablement interconnecté.

### 🎯 Vision du projet

Transformer la gestion des connaissances personnelles en passant d'un stockage statique à un **système vivant** qui :
- **Comprend** le contexte et les relations entre vos informations
- **Suggère** des connexions que vous n'auriez pas vues
- **Évolue** avec vos habitudes et besoins
- **Facilite** la découverte de patterns et d'insights

## ✨ Fonctionnalités clés

### 🤖 Interface conversationnelle intelligente
- Posez des questions en langage naturel à votre base de connaissances
- L'IA comprend le contexte et maintient une conversation cohérente
- Ajoutez des informations simplement en parlant avec l'assistant

### 🕸️ Graphe de connaissances
- Stockage des données sous forme de **nœuds** (entités) et **relations** (connexions)
- Découverte automatique de liens entre vos informations
- Navigation intuitive dans votre réseau de connaissances

### 📊 Tableau de bord personnalisable
- Widgets drag & drop pour visualiser vos données
- Graphiques de croissance de vos connaissances
- Tableaux de données configurables
- Interface modulaire et extensible

### 🔄 Architecture multi-agents
- **Agent Orchestrateur** : Coordonne les interactions et comprend vos demandes
- **Agent Lecteur** : Expert en exploration et recherche dans le graphe
- **Agent Intégrateur** : Spécialiste de l'ajout et de la structuration des données
- **Agent Restructurateur** : Maintient la qualité et optimise le graphe

## 🛠️ Technologies utilisées

### Frontend & Interface
- **Next.js 15** avec App Router - Framework React moderne
- **TypeScript** - Typage statique pour une meilleure robustesse
- **Tailwind CSS v4** - Framework CSS utilitaire
- **Shadcn/ui** - Composants UI modernes et accessibles
- **Framer Motion** - Animations fluides et interactives

### IA & Communication
- **Vercel AI SDK** - Intégration IA streamlinée
- **Anthropic Claude** - Modèle de langage pour l'orchestrateur
- **Model Context Protocol (MCP)** - Communication entre IA et données
- **Architecture multi-agents** - Spécialisation des rôles IA

### Données & Backend
- **Neo4j** - Base de données graphe pour les relations complexes
- **Recharts** - Visualisations de données interactives
- **React Grid Layout** - Dashboard drag & drop personnalisable

### Développement
- **ESLint** - Linting et bonnes pratiques
- **TypeScript** - Types stricts pour la fiabilité
- **Zod** - Validation des données runtime

## 👩‍💻 Pour les développeurs

### Structure du code

```
src/
├── app/                     # Pages Next.js (App Router)
│   ├── api/chat/           # API pour les conversations IA
│   ├── chat/               # Interface de chat
│   └── page.tsx            # Page d'accueil avec dashboard
├── components/             
│   ├── chat/               # Composants interface conversationnelle
│   │   ├── ChatInterface.tsx        # Composant principal (refactorisé)
│   │   └── components/              # Sous-composants modulaires
│   │       ├── MessageComponent.tsx # Affichage des messages
│   │       ├── ChatInput.tsx        # Zone de saisie
│   │       ├── MessagesDisplay.tsx  # Liste des messages
│   │       └── MarkdownContent.tsx  # Rendu Markdown
│   ├── dashboard/          # Système de widgets personnalisables
│   │   ├── Dashboard.tsx           # Orchestrateur du dashboard
│   │   └── widgets/                # Widgets disponibles
│   └── ui/                 # Composants UI réutilisables (Shadcn)
└── lib/
    ├── orchestration/      # Logique multi-agents
    ├── reasoning/          # Wrapper de raisonnement IA
    └── utils/              # Utilitaires partagés
```

### Concepts clés du code

#### Architecture multi-agents
- **Orchestrateur** (`KnowledgeHubOrchestrator`) : Point d'entrée qui coordonne
- **Agents spécialisés** : Chacun avec un rôle précis (lecture, écriture, analyse)
- **Communication** : Via descriptions de tâches en langage naturel

#### Composants modulaires
- **ChatInterface** refactorisé en sous-composants pour la maintenabilité
- **Widgets** avec système de configuration flexible
- **Hooks personnalisés** pour la logique métier

### Scripts disponibles

```bash
npm run dev      # Développement avec hot reload
npm run build    # Build de production
npm run start    # Démarrage du build de production
npm run lint     # Vérification du code avec ESLint
```

## 🗺️ Roadmap et état du projet

### Statut actuel : **Prototype fonctionnel** 🚧

Le projet est dans une phase de développement active avec les fonctionnalités de base opérationnelles :

- ✅ **Interface conversationnelle** : Chat IA fonctionnel avec streaming
- ✅ **Architecture multi-agents** : Orchestrateur et agents spécialisés
- ✅ **Dashboard personnalisable** : Widgets drag & drop
- ✅ **Base technique solide** : Next.js, TypeScript, composants modulaires
- 🔄 **Intégration Neo4j** : En cours de finalisation
- 🔄 **Outils MCP** : Server et protocoles de communication

### Prochaines étapes

1. **Phase 1** : Stabilisation du système multi-agents
2. **Phase 2** : Enrichissement des capacités de graphe
3. **Phase 3** : Intégrations externes (Notion, Gmail, etc.)
4. **Phase 4** : Widgets métier spécialisés
5. **Phase 5** : Optimisations et déploiement

## 🤝 Contribution et recherche

Ce projet explore des concepts novateurs à l'intersection de :
- **Gestion des connaissances personnelles**
- **Intelligence artificielle multi-agents**
- **Bases de données graphe**
- **Interfaces conversationnelles**

### Pour les chercheurs

Le projet peut servir de base pour étudier :
- L'efficacité des architectures multi-agents dans la gestion de connaissances
- L'impact des interfaces conversationnelles sur l'organisation de l'information
- Les patterns d'utilisation des graphes de connaissances personnelles
- Les stratégies d'intégration de sources de données hétérogènes

### Contribution technique

Les contributions sont encouragées ! Domaines d'intérêt :
- Amélioration des prompts d'agents IA
- Nouveaux widgets de visualisation
- Connecteurs vers d'autres services
- Optimisations de performance
- Tests et documentation

## 📬 Contact

Ce projet personnel explore les possibilités d'un assistant IA vraiment intelligent pour la gestion des connaissances. N'hésitez pas à explorer le code, expérimenter et partager vos retours !

---

**Note** : Ce projet est en développement actif. Certaines fonctionnalités peuvent être en construction ou en phase expérimentale. Consultez les issues GitHub pour l'état détaillé des fonctionnalités.
