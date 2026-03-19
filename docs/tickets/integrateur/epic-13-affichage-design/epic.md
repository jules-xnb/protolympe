# [13-0-0] Intégrateur - Affichage & Design

## Description

Permettre à l'intégrateur de personnaliser le thème visuel de l'espace utilisateur final d'un client, avec **prévisualisation en temps réel** (boutons, typographie, formulaires, cards, badges, tableaux). La page offre quatre sections de configuration : **identité visuelle** (upload de logo SVG/PNG/JPEG ou nom textuel), **couleurs** (primaire et secondaire avec calcul automatique du contraste WCAG pour le texte), **arrondi des composants** (5 presets de Sharp à Pill + curseur personnalisé 0-2rem), et **typographie** (10 polices Google Fonts avec chargement dynamique). Les paramètres sont injectés comme CSS custom properties via `data-space="user-final"` pour isoler le thème de l'interface admin. Sauvegarde manuelle avec possibilité de réinitialiser.
