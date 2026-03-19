# [12-0-0] Intégrateur - Listes (Référentiels)

## Description

Permettre à l'intégrateur de créer et gérer les listes de valeurs référentielles d'un client, utilisées dans les champs des objets métiers. La page affiche un tableau des référentiels avec recherche et filtrage par tag. L'intégrateur peut créer des listes (nom, tag, description, slug auto-généré) et gérer leurs **valeurs hiérarchiques** (jusqu'à 20 niveaux) via un tiroir dédié : ajout en masse (une valeur par ligne, codes auto-générés), édition inline, couleur parmi 16 presets, parentage avec détection de circularités, et archivage/restauration. L'import CSV en 4 étapes (upload, mapping intelligent, aperçu avec détection d'erreurs, exécution atomique par référentiel avec rollback) et l'export CSV sont disponibles. La gestion d'archives permet de restaurer des listes et des valeurs supprimées.
