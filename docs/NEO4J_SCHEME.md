# Documentation du Schéma Neo4j - Hub de Connaissances Personnel IA

Ce document définit le schéma de données Neo4j pour le Hub de Connaissances Personnel IA. Il décrit les nœuds, leurs propriétés, et les relations entre eux, en suivant une approche évolutive compatible avec la roadmap du projet.

## Table des matières

1. [Principes de conception](#principes-de-conception)
2. [Types de nœuds principaux](#types-de-nœuds-principaux)
3. [Relations](#relations)
4. [Structure temporelle](#structure-temporelle)
5. [Extensions futures](#extensions-futures)
6. [Exemples de requêtes Cypher](#exemples-de-requêtes-cypher)
7. [Stratégies d'indexation](#stratégies-dindexation)
8. [Evolution du schéma](#evolution-du-schéma)

## Principes de conception

Le schéma Neo4j du Hub de Connaissances suit ces principes directeurs :

1. **Simplicité initiale** : Commence avec un ensemble minimal de nœuds et relations pour faciliter le démarrage
2. **Extensibilité** : Conçu pour évoluer progressivement avec les phases du projet
3. **Connectivité** : Privilégie les relations entre entités pour faciliter les traversées de graphe
4. **Temporalité** : Structure spécifique pour les requêtes temporelles efficaces
5. **Sémantique** : Capture le sens et le contexte des informations, pas seulement leur contenu
6. **Multi-résolution** : Stocke l'information à différents niveaux de détail pour une exploration progressive et efficace

## Types de nœuds principaux

### `:Entry`
Représente les entrées de base créées via la conversation avec l'IA.

**Propriétés** :
- `id` : Identifiant unique (UUID)
- `brief` : Résumé très court (1-2 phrases)
- `summary` : Résumé intermédiaire (1 paragraphe)
- `content` : Contenu textuel complet de l'entrée
- `type` : Type d'entrée (`note`, `task`, `thought`, `question`, etc.)
- `createdAt` : Horodatage de création
- `updatedAt` : Horodatage de dernière modification
- `source` : Source de l'entrée (par défaut `chat`)

**Cas d'utilisation** :
- Notes rapides entrées via le chat
- Questions posées à l'IA
- Tâches ou rappels
- Pensées ou réflexions

### `:Concept`
Représente des entités et concepts extraits des entrées ou définis explicitement.

**Propriétés** :
- `id` : Identifiant unique
- `name` : Nom du concept (doit être unique)
- `brief` : Description très courte (1 phrase)
- `summary` : Résumé des caractéristiques principales (1 paragraphe)
- `description` : Description complète du concept
- `type` : Type de concept (`person`, `project`, `technology`, `place`, `organization`, etc.)
- `createdAt` : Horodatage de création

**Cas d'utilisation** :
- Centraliser les références aux personnes, projets, technologies
- Servir de points d'ancrage pour les connexions entre différentes entrées
- Créer une taxonomie émergente des sujets importants

### `:Tag`
Étiquettes pour catégoriser et filtrer les entrées.

**Propriétés** :
- `name` : Nom du tag (unique)
- `color` : Code couleur pour l'UI (ex: "#FF5733")
- `description` : Description brève (optionnel)

**Cas d'utilisation** :
- Catégoriser les entrées (urgent, important, idée, etc.)
- Filtrer le contenu du tableau de bord
- Grouper des entrées dans des widgets

### `:TimePoint`
Points dans le temps pour faciliter les requêtes temporelles.

**Propriétés** :
- `date` : Date au format YYYY-MM-DD
- `year` : Année (nombre)
- `month` : Mois (1-12)
- `day` : Jour du mois (1-31)
- `dayOfWeek` : Jour de la semaine (1-7, 1=Lundi)
- `type` : Niveau de granularité (`day`, `month`, `year`)

**Cas d'utilisation** :
- Ancrer temporellement les entrées et activités
- Faciliter les requêtes comme "tout ce qui s'est passé ce mois-ci"
- Agréger des données pour des visualisations temporelles

### `:Activity`
Actions ou activités enregistrées avec une dimension temporelle.

**Propriétés** :
- `id` : Identifiant unique
- `name` : Nom de l'activité
- `brief` : Description très courte (1 phrase)
- `summary` : Résumé des informations clés (1 paragraphe)
- `description` : Description détaillée de l'activité
- `type` : Type d'activité (`meeting`, `work_session`, `exercise`, `reading`, etc.)
- `status` : Statut (`planned`, `in_progress`, `completed`, `cancelled`)
- `startTime` : Horodatage de début
- `endTime` : Horodatage de fin (optionnel)

**Cas d'utilisation** :
- Suivi du temps passé sur différentes activités
- Planification de sessions de travail
- Tracking d'habitudes ou routines

## Relations

### `(:Entry)-[:MENTIONS]->(:Concept)`
Indique qu'une entrée mentionne ou fait référence à un concept.

**Propriétés** :
- `context` : Contexte de la mention (optionnel)

**Exemple** : Une note mentionnant un projet ou une personne.

### `(:Concept)-[:RELATED_TO]->(:Concept)`
Établit une relation entre deux concepts.

**Propriétés** :
- `type` : Nature de la relation (ex: `part_of`, `works_with`, `depends_on`)
- `strength` : Force de la relation (1-10)
- `description` : Description de la relation (optionnel)

**Exemple** : Une personne travaille sur un projet, une technologie fait partie d'une stack.

### `(:Entry)-[:CREATED_ON]->(:TimePoint)`
Lie une entrée à son point dans le temps de création.

**Exemple** : Une note créée le 15 avril 2023.

### `(:Entry)-[:TAGGED]->(:Tag)`
Indique qu'une entrée est catégorisée avec un tag.

**Exemple** : Une tâche marquée comme "urgent".

### `(:Activity)-[:ACTIVITY_OF]->(:Concept)`
Indique qu'une activité concerne un concept particulier.

**Exemple** : Une session de travail sur un projet spécifique.

### `(:Activity)-[:OCCURS_ON]->(:TimePoint)`
Lie une activité à son point dans le temps.

**Exemple** : Une réunion qui a lieu le 3 mai 2023.

### `(:Entry)-[:REFERS_TO]->(:Activity)`
Indique qu'une entrée fait référence à une activité.

**Exemple** : Une note prise pendant une réunion.

### `(:Entry)-[:FOLLOWS]->(:Entry)`
Établit une séquence ou une relation entre entrées.

**Propriétés** :
- `type` : Type de séquence (`continuation`, `reply`, `elaboration`, etc.)

**Exemple** : Une note qui développe une idée mentionnée dans une note précédente.

## Structure temporelle

Pour faciliter les requêtes temporelles efficaces, les `TimePoint` sont organisés hiérarchiquement :

```cypher
// Création d'une structure année > mois > jour
MERGE (y:TimePoint {type: "year", year: 2023, date: "2023"})
MERGE (m:TimePoint {type: "month", year: 2023, month: 4, date: "2023-04"})
MERGE (d:TimePoint {type: "day", year: 2023, month: 4, day: 15, date: "2023-04-15", dayOfWeek: 6})
MERGE (y)-[:CONTAINS]->(m)
MERGE (m)-[:CONTAINS]->(d)
```

Cette structure permet des requêtes comme :
- Toutes les entrées d'un mois spécifique
- Toutes les activités d'une semaine
- Agrégation par période temporelle

## Extensions futures

Le schéma est conçu pour évoluer avec les Phases 3-5 du projet, notamment pour intégrer des sources externes. Voici les extensions prévues :

### `:NotionPage`
Pages importées depuis Notion.

**Propriétés** :
- `id` : Identifiant unique Notion
- `title` : Titre de la page
- `brief` : Aperçu/résumé très court du contenu (1-2 phrases)
- `summary` : Résumé intermédiaire du contenu (1 paragraphe)
- `content` : Contenu complet indexé (potentiellement volumineux)
- `url` : Lien vers la page Notion
- `lastEdited` : Dernière modification
- `database` : Nom de la base de données Notion parent (si applicable)

**Relations** :
- `(:NotionPage)-[:RELATED_TO]->(:Concept)`
- `(:NotionPage)-[:LAST_EDITED_ON]->(:TimePoint)`
- `(:NotionPage)-[:CONTAINS]->(:NotionPage)` (structure hiérarchique)

### `:Event`
Événements importés depuis les calendriers (Google Calendar, Outlook).

**Propriétés** :
- `id` : Identifiant unique
- `title` : Titre de l'événement
- `description` : Description
- `location` : Lieu
- `startTime` : Début
- `endTime` : Fin
- `source` : Source (Google Calendar, Outlook, etc.)
- `status` : Statut (confirmé, annulé, etc.)

**Relations** :
- `(:Event)-[:OCCURS_ON]->(:TimePoint)`
- `(:Person)-[:PARTICIPATES_IN]->(:Event)`
- `(:Event)-[:RELATED_TO]->(:Concept)`

### `:Email`
Emails importés des services de messagerie.

**Propriétés** :
- `id` : Identifiant unique
- `subject` : Sujet
- `brief` : Aperçu très court (sujet + 1 phrase)
- `summary` : Résumé du contenu principal (quelques phrases)
- `content` : Contenu complet de l'email
- `time` : Horodatage de l'email
- `source` : Source (Gmail, Outlook, etc.)
- `folder` : Dossier dans la messagerie

**Relations** :
- `(:Person)-[:SENT]->(:Email)`
- `(:Person)-[:RECEIVED]->(:Email)`
- `(:Email)-[:SENT_ON]->(:TimePoint)`
- `(:Email)-[:MENTIONS]->(:Concept)`
- `(:Email)-[:RELATED_TO]->(:Event)` (pour les emails concernant des événements)

### `:Person`
Contacts et personnes.

**Propriétés** :
- `id` : Identifiant unique
- `name` : Nom complet
- `email` : Adresse email
- `role` : Rôle ou relation avec l'utilisateur
- `organization` : Organisation/entreprise

**Relations** :
- `(:Person)-[:MEMBER_OF]->(:Organization)`
- `(:Person)-[:INVOLVED_IN]->(:Project)`
- `(:Person)-[:RELATED_TO]->(:Person)` (relations entre personnes)

## Exemples de requêtes Cypher

### Trouver toutes les entrées d'un concept
```cypher
MATCH (e:Entry)-[:MENTIONS]->(c:Concept {name: "Next.js"})
RETURN e.content, e.createdAt
ORDER BY e.createdAt DESC
```

### Entrées récentes par tag
```cypher
MATCH (e:Entry)-[:TAGGED]->(t:Tag {name: "important"})
MATCH (e)-[:CREATED_ON]->(tp:TimePoint)
WHERE tp.date >= date('2023-04-01')
RETURN e.content, e.type, tp.date
ORDER BY tp.date DESC
```

### Concepts les plus mentionnés ce mois-ci
```cypher
MATCH (e:Entry)-[:MENTIONS]->(c:Concept)
MATCH (e)-[:CREATED_ON]->(tp:TimePoint)
WHERE tp.year = 2023 AND tp.month = 4
RETURN c.name, c.type, count(e) as mentionCount
ORDER BY mentionCount DESC
LIMIT 10
```

### Activités par projet
```cypher
MATCH (a:Activity)-[:ACTIVITY_OF]->(c:Concept {type: "project"})
MATCH (a)-[:OCCURS_ON]->(tp:TimePoint)
WHERE tp.date >= date('2023-04-01')
RETURN c.name as project, a.type, count(a) as activityCount, 
       sum(duration.between(a.startTime, a.endTime).minutes) as totalMinutes
ORDER BY project
```

### Relation entre entrées et concepts
```cypher
MATCH path = (e1:Entry)-[:MENTIONS]->(c:Concept)<-[:MENTIONS]-(e2:Entry)
WHERE id(e1) <> id(e2)
RETURN e1.content, c.name, e2.content
LIMIT 10
```

## Structure à multi-résolution

Un aspect fondamental du schéma est la structure à multi-résolution, qui stocke l'information à différents niveaux de détail. Cette approche offre plusieurs avantages :

1. **Économie de tokens** : L'IA peut explorer efficacement de grandes quantités d'information sans consommer inutilement son contexte
2. **Exploration progressive** : L'IA peut commencer par une vue d'ensemble puis "zoomer" sur les détails pertinents
3. **Pertinence contextuelle** : Permet de filtrer rapidement ce qui est important pour répondre à une requête spécifique

### Niveaux de résolution

Pour les principaux types de nœuds, nous définissons trois niveaux de détail :

1. **`brief`** : Description très concise (1-2 phrases)
   - Aperçu minimaliste pour l'indexation et le filtrage initial
   - Contient uniquement les informations essentielles pour identifier l'entité
   - Idéal pour les requêtes exploratoires sur de nombreux nœuds

2. **`summary`** : Résumé intermédiaire (environ 1 paragraphe)
   - Capture les principales informations sans les détails
   - Inclut les aspects les plus importants ou saillants
   - Utile pour la compréhension globale sans consommer trop de tokens

3. **`content`/`description`** : Contenu complet
   - Information complète et détaillée
   - À utiliser uniquement lorsque les détails sont nécessaires à la requête
   - Peut être volumineux pour certains types (pages Notion, emails, etc.)

### Stratégie d'exploration pour l'IA

Cette structure permet à Claude d'adopter une approche d'exploration en plusieurs étapes :

1. **Étape de filtrage** : Interroger d'abord les `brief` pour identifier les nœuds potentiellement pertinents
   ```cypher
   MATCH (e:Entry) 
   RETURN e.id, e.brief, e.type
   ```

2. **Étape d'évaluation** : Récupérer les `summary` des nœuds les plus prometteurs
   ```cypher
   MATCH (e:Entry)
   WHERE e.id IN ['ent-1', 'ent-3', 'ent-7']
   RETURN e.id, e.summary, e.type, e.createdAt
   ```

3. **Étape d'approfondissement** : Accéder au `content` complet uniquement pour les nœuds les plus pertinents
   ```cypher
   MATCH (e:Entry)
   WHERE e.id = 'ent-3'
   RETURN e.id, e.content, e.type, e.createdAt
   ```

Cette approche par étapes est particulièrement efficace pour les requêtes complexes impliquant de nombreux nœuds, comme "résumer mes réflexions sur le projet X au cours des 3 derniers mois" ou "trouver les connexions entre les concepts A et B à travers mes notes".

## Stratégies d'indexation

Pour optimiser les performances des requêtes, voici les index recommandés :

```cypher
// Index sur les propriétés fréquemment utilisées en recherche
CREATE INDEX entry_id_index FOR (n:Entry) ON (n.id);
CREATE INDEX concept_name_index FOR (n:Concept) ON (n.name);
CREATE INDEX tag_name_index FOR (n:Tag) ON (n.name);
CREATE INDEX timepoint_date_index FOR (n:TimePoint) ON (n.date);
CREATE INDEX activity_id_index FOR (n:Activity) ON (n.id);

// Index composites pour les requêtes courantes
CREATE INDEX timepoint_year_month_index FOR (n:TimePoint) ON (n.year, n.month);
CREATE INDEX concept_type_index FOR (n:Concept) ON (n.type);
CREATE INDEX entry_type_index FOR (n:Entry) ON (n.type);

// Index pour la structure à multi-résolution
CREATE INDEX entry_brief_index FOR (n:Entry) ON (n.brief);
CREATE INDEX concept_brief_index FOR (n:Concept) ON (n.brief);
```

## Evolution du schéma

Le schéma évoluera en suivant ces principes :

1. **Rétrocompatibilité** : Les évolutions ne devraient pas casser les fonctionnalités existantes
2. **Migration de données** : Chaque changement structurel important devrait s'accompagner d'un script de migration
3. **Versioning** : Maintenir une version du schéma dans une propriété de nœud spécial
4. **Documentation** : Mettre à jour cette documentation pour chaque évolution significative

### Procédure de modification du schéma

1. Documenter le changement proposé et sa justification
2. Évaluer l'impact sur les données existantes et les requêtes
3. Créer les scripts de migration nécessaires
4. Tester sur un environnement de développement
5. Appliquer sur l'environnement de production
6. Mettre à jour la documentation et la version du schéma

### Gestion des versions du schéma

Un nœud spécial `:SchemaInfo` sera maintenu pour suivre les versions du schéma :

```cypher
MERGE (s:SchemaInfo {id: "main"})
SET s.version = "1.0",
    s.lastUpdated = datetime(),
    s.description = "Schéma initial pour la Phase 1"
```

Lors des mises à jour, ce nœud sera modifié pour refléter la nouvelle version.