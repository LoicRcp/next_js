# Knowledge Hub - IA Personal Knowledge Management

## À propos du projet

Knowledge Hub est un système de gestion des connaissances personnelles alimenté par l'IA, conçu pour centraliser, connecter et analyser des informations provenant de diverses sources. L'application permet aux utilisateurs d'interagir avec leurs données via une interface conversationnelle et de visualiser leurs connaissances sur un tableau de bord personnalisable.

![Knowledge Hub Dashboard](https://via.placeholder.com/800x450/1a1a1a/888888?text=Knowledge+Hub+Dashboard)

## Fonctionnalités principales

- **Interface conversationnelle** : Interagissez avec l'IA pour ajouter, interroger et analyser vos connaissances
- **Tableau de bord personnalisable** : Créez et organisez des widgets pour visualiser vos données
- **Structure en graphe** : Stockage des données dans une base de données Neo4j pour préserver les relations entre les informations
- **Intégration d'outils externes** (à venir) : Connectez vos données depuis Notion, Google Calendar, services d'email, etc.
- **Visualisations dynamiques** : Affichez vos données sous forme de graphiques, tableaux et autres représentations visuelles

## Stack technologique

- **Frontend** : Next.js 15 avec React 18
- **Styling** : Tailwind CSS avec Shadcn/ui
- **Graphiques** : Recharts pour les visualisations de données
- **Tableau de bord** : react-grid-layout pour les widgets glisser-déposer
- **Base de données** : Neo4j (base de données graphe)
- **IA** : API Anthropic Claude
- **Communication IA <-> Données** : Model Context Protocol (MCP)

## Prérequis

- Node.js (v18+)
- Neo4j Database (v5+)
- Clé API Anthropic Claude

## Installation

1. Clonez le dépôt
```bash
git clone [url-du-repo]
cd knowledge-hub/next_js
```

2. Installez les dépendances
```bash
npm install
```

3. Configurez les variables d'environnement
```
# Créez un fichier .env.local avec les variables suivantes
ANTHROPIC_API_KEY=votre_clé_api_claude
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=votre_mot_de_passe
```

4. Lancez le serveur de développement
```bash
npm run dev
```

5. Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur

## Structure du projet

```
next_js/
├── public/               # Assets statiques
├── src/
│   ├── app/              # Pages de l'application (App Router)
│   ├── components/       # Composants React réutilisables
│   │   ├── charts/       # Composants de visualisation
│   │   ├── dashboard/    # Système de tableau de bord et widgets
│   │   ├── demo/         # Composants de démonstration
│   │   └── ui/           # Composants UI réutilisables (Shadcn)
│   └── lib/              # Utilitaires et hooks
└── ...
```

## Roadmap

Le développement suit une approche itérative divisée en plusieurs phases :

- ✅ **Phase 0** : Préparation et design initial
- 🔄 **Phase 1** : Fondation technique et interaction de base
- 🔄 **Phase 2** : Fonctionnalités conversationnelles et graphe avancées
- 🔄 **Phase 3** : Intégration des sources externes
- 🔜 **Phase 4** : Widgets avancés et personnalisation UI
- 🔜 **Phase 5** : Raffinement, tests et déploiement

Consultez le document de roadmap complet pour plus de détails.

## Contribution

Les contributions sont les bienvenues ! Veuillez suivre les bonnes pratiques décrites dans la documentation technique.

## Licence

[Type de licence]
