# [8-0-0] Intégrateur - Workflows

## Description

Permettre à l'intégrateur de créer et configurer les workflows de validation associés aux objets métiers d'un client. La page liste les workflows avec leur nom, type, statut de validité et nombre de nœuds. L'intégrateur peut créer, modifier, dupliquer et supprimer des workflows. Chaque workflow se configure via deux onglets : un **éditeur de graphe visuel** (React Flow) pour définir les nœuds (Répondant, Validations, Validé), les transitions (approbation/rejet) et les rôles validateurs/lecteurs par étape ; et un **éditeur de formulaires** pour configurer, par nœud, les sections et champs visibles, leur mode (éditable/lecture seule), les commentaires, l'obligatoire, et les conditions de visibilité conditionnelle. Le système indique la validité du workflow via des avertissements visuels (nœuds sans rôles, transitions manquantes). La sauvegarde est automatique en temps réel.
