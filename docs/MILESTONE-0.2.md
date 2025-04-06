# Rapport de Jalon 0.2 - Choix Technologiques & Configuration

Ce document résume les accomplissements, choix techniques et configurations effectués lors du Jalon 0.2 du projet Knowledge Hub.

## Objectif du Jalon 0.2

Valider et intégrer les bibliothèques clés pour l'UI, les graphiques, le drag & drop, et faire un premier choix éclairé concernant le serveur MCP.

## Bibliothèques installées et configurées

### 1. Bibliothèque UI : Shadcn/ui

Shadcn/ui a été choisi comme base de composants UI pour sa flexibilité, sa qualité et son approche de copie de code plutôt que d'installation de package.

**Configuration réalisée :**
- Installation et initialisation via `npx shadcn-ui@latest init`
- Configuration du thème sombre comme thème par défaut
- Ajout des composants de base suivants :
  - Button
  - Card
  - Input
  - Table
  - Alert
  - Progress
  - Accordion
  - Tabs

**Justification :**
Shadcn/ui offre une excellente base de composants accessibles et personnalisables, tout en permettant un contrôle total sur le code source. Le design minimaliste s'aligne parfaitement avec l'esthétique recherchée pour Knowledge Hub.

### 2. Bibliothèque de Graphiques : Recharts

Recharts a été sélectionné comme bibliothèque de visualisation de données pour sa simplicité et sa flexibilité.

**Configuration réalisée :**
- Installation via `npm install recharts`
- Création d'un composant de test `ClientLineChart` pour valider l'intégration
- Adaptation pour une utilisation côté client avec Next.js (directive "use client")
- Ajustement de la version pour compatibilité avec React 18

**Justification :**
Recharts utilise une API déclarative basée sur des composants React, ce qui facilite la création de graphiques personnalisés. Les transitions animées et la réactivité offrent une expérience utilisateur moderne.

### 3. Bibliothèque Drag & Drop : react-grid-layout

Pour le système de tableau de bord à widgets, nous avons choisi react-grid-layout pour sa spécialisation dans les grilles responsives et interactives.

**Configuration réalisée :**
- Installation via `npm install react-grid-layout @types/react-grid-layout`
- Configuration d'une grille responsive de 12 colonnes
- Personnalisation des poignées de redimensionnement dans toutes les directions
- Implémentation d'un système de détection des tailles minimales des widgets
- Configuration de la persistance dans localStorage

**Justification :**
react-grid-layout est spécifiquement conçu pour les tableaux de bord interactifs et offre toutes les fonctionnalités nécessaires : glisser-déposer, redimensionnement, persistance de mise en page, etc.

### 4. Compatibilité React

Au cours du développement, nous avons rencontré des problèmes de compatibilité entre les bibliothèques et les versions récentes de React. Nous avons finalement opté pour React 18 pour garantir la compatibilité avec l'ensemble de l'écosystème.

**Modifications effectuées :**
- Passage de React 19 à React 18.2.0
- Mise à jour des types TypeScript correspondants
- Adaptation des composants pour utiliser la directive "use client" lorsque nécessaire

## Système de Dashboard & Widgets

Une grande partie de ce jalon a été consacrée à la mise en place d'un système de dashboard à widgets extensible et performant.

### Architecture des Widgets

Nous avons conçu un système modulaire en plusieurs couches :

1. **Registre de Widgets**
   - Configuration centrale de tous les types de widgets disponibles
   - Définition des tailles par défaut et minimales
   - Mapping des types aux composants

2. **Container de Widget**
   - Apparence et comportement communs (header, bouton de fermeture)
   - Gestion des interactions de base (drag, resize)

3. **Wrapper de mesure de taille**
   - Détection intelligente des dimensions minimales requises
   - Adaptation automatique de la taille du widget

4. **Composants de contenu spécifiques**
   - Graphiques, tableaux, listes, etc.
   - Encapsulés pour fonctionner de manière cohérente dans le système

### Défis résolus

1. **Dimensionnement automatique des widgets**
   - Mise en place d'un système qui détecte la taille optimale d'un widget
   - Prévention des barres de défilement par redimensionnement intelligent
   - Limitation du redimensionnement manuel pour éviter des widgets trop petits

2. **Style cohérent**
   - Création d'un thème unifié pour tous les widgets
   - Adaptation pour le mode sombre par défaut
   - Personnalisation des éléments d'interface de react-grid-layout

3. **Réactivité**
   - Adaptation des widgets à différentes tailles d'écran
   - Observer pattern pour détecter les changements de dimension
   - Calcul proportionnel des tailles de grille

## Choix du serveur MCP

Pour le Model Context Protocol (MCP), nous avons effectué des recherches préliminaires. À ce stade, nous penchons vers une implémentation personnalisée pour les raisons suivantes :

- Besoin de personnalisation pour notre cas d'utilisation spécifique
- Intégration étroite nécessaire avec Neo4j
- Fonctionnalités spécifiques comme la génération de widgets

La spécification précise et l'implémentation du serveur MCP feront l'objet d'une attention particulière lors de la Phase 1.

## Configuration Vercel AI SDK

Nous avons configuré les bases pour l'intégration avec l'API Claude d'Anthropic :

- Installation du Vercel AI SDK
- Configuration initiale des variables d'environnement
- Préparation des structures pour l'intégration future

## Tests et Démonstration

Pour valider les choix technologiques, nous avons créé plusieurs composants de démonstration :

1. **Graphique linéaire** : Visualisation de données temporelles
2. **Tableau de données** : Affichage de données structurées
3. **Alertes** : Notifications système
4. **Barres de progression** : Indicateurs d'état
5. **Accordéon** : Affichage de FAQ et contenu extensible
6. **Système d'onglets** : Organisation de contenu en catégories

Ces composants démontrent l'intégration réussie des bibliothèques choisies et serviront de base pour les développements futurs.

## Documentation mise en place

Nous avons créé trois documents de documentation importants :

1. **README.md** : Présentation du projet, instructions d'installation et d'utilisation
2. **Documentation technique** : Explication détaillée des choix d'implémentation et bonnes pratiques
3. **Rapport de jalon** (ce document) : Résumé des accomplissements du Jalon 0.2

## Prochaines étapes (Jalon 0.3)

Pour compléter la Phase 0, le Jalon 0.3 se concentrera sur :

1. Finalisation des maquettes UI/UX pour les écrans principaux
2. Définition du schéma initial de la base de données Neo4j
3. Consolidation de la documentation du projet

---

Ce jalon a posé les fondations technologiques solides sur lesquelles le projet Knowledge Hub pourra se développer de manière cohérente et structurée.
