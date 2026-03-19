# [5-4-1] Tableau unifié des champs (système + personnalisés)

## Description

Afficher tous les champs (système et personnalisés) dans un tableau unique et triable. Les champs système sont visuellement distingués (cadenas, grisés) et non archivables. Le label du champ "Nom" est modifiable via une popup.

## Détails fonctionnels

- **Tableau unique** regroupant champs système et champs personnalisés dans un seul DataTable
- Recherche par nom (masquée s'il n'y a que les champs système)
- Colonnes :
  - **Nom** : nom du champ + slug en sous-titre (mono). Les champs système affichent une icône cadenas à gauche et le texte est grisé
  - **Type** : badge du type
  - **Référence** : nom du référentiel ou nom de l'objet référencé, tiret si aucun
  - **Unique** : icône si valeur unique activée
  - **Auto-génération** : icône différente selon le mode (Hash=compteur bleu, Fingerprint=UUID violet, Calendar=date orange, PinIcon=valeur fixe vert)
  - **Lecture seule** : icône check orange si activé
  - **Requis** : icône check verte si activé
  - **Action** : menu déroulant (bouton `⋯`) avec les actions disponibles

### Champs système

- Affichés dans le même tableau, triables avec les autres champs
- **Nom** (slug: name, type: Texte) — seul champ système modifiable : le menu action ouvre une popup pour éditer le label
- **Entité organisationnelle** (slug: eo_id, type: Réf. entité org., requis)
- **Statut** (slug: status, type: Texte)
- Bouton action `⋯` grisé/disabled sauf pour le champ Nom
- Label personnalisé sauvegardé dans settings.name_field_label

### Champs personnalisés

- Menu action `⋯` avec deux options : "Modifier" (ouvre le dialog d'édition) et "Archiver" (ouvre la confirmation)
- Bouton "Ajouter un champ" dans le header de page

## Critères de done

- [ ] Tableau unifié avec champs système et personnalisés ensemble
- [ ] Champs système visuellement distingués (cadenas, texte grisé)
- [ ] Tri fonctionnel sur tous les champs (système non forcés en haut)
- [ ] Bouton action `⋯` grisé pour les champs système sauf Nom
- [ ] Clic sur Modifier du champ Nom ouvre une popup avec input + boutons Annuler/Enregistrer
- [ ] Sauvegarde du label dans settings.name_field_label
- [ ] Menu action des champs personnalisés : Modifier + Archiver
- [ ] Colonne Unique affichée avec icône
- [ ] Colonne Auto-génération affichée avec icônes contextuelles (compteur, UUID, date, valeur fixe)
- [ ] Recherche par nom fonctionnelle

## Dépendances

- Aucune
