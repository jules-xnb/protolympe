# [6-3-3] Configuration avancée des champs d'entité

## Description

Options de configuration avancées pour les champs personnalisés : commentaires sur transitions de statut, auto-génération de valeurs, formatage d'affichage et règles de validation inter-champs.

## Détails fonctionnels

### Commentaires sur transitions
- Applicable au champ "Statut" (booléen actif/inactif) et potentiellement aux champs de type booléen
- Configuration des transitions nécessitant un commentaire obligatoire ou optionnel :
  - Transition (ex : Actif → Inactif)
  - Commentaire obligatoire (toggle)
- Quand un utilisateur effectue une transition configurée, un dialog de commentaire s'affiche

### Auto-génération de valeurs
- Permet de générer automatiquement la valeur d'un champ à la création d'une entité
- Modes d'auto-génération (contextuels selon le type de champ) :
  - **Compteur** : préfixe + compteur avec padding (ex : "ENT-0001", "ENT-0002")
  - **Valeur fixe** : valeur constante pré-remplie
  - **UUID** : identifiant unique généré automatiquement
  - **Date du jour** : date courante au moment de la création
- Modes disponibles par type de champ :
  - text, textarea : compteur, valeur fixe, UUID, date du jour
  - number, decimal : compteur, valeur fixe
  - date, datetime : valeur fixe, date du jour
  - email, phone, url, time : valeur fixe uniquement
  - select, multiselect : valeur fixe uniquement (valeur choisie parmi les options du référentiel)
- Configuration : mode, préfixe, padding (nombre de chiffres), valeur fixe

### Règles de validation inter-champs
- Définir des règles de validation conditionnelles entre plusieurs champs
- Types de champs supportés : text, textarea, email, phone, url, date, datetime, number, decimal, select, multiselect, checkbox
- Types de règles :
  - **date_before**, **date_after** : pour les champs date et datetime
  - **number_less_than**, **number_greater_than** : pour les champs number et decimal
  - **required_if_filled** : pour tous les types supportés
- Chaque règle comprend :
  - Champ source et condition
  - Champ cible et contrainte
- Badge avec compteur de règles affiché dans le tableau des champs

## Critères de done

- [ ] Configuration des commentaires sur transitions
- [ ] Auto-génération avec les 4 modes (compteur, valeur fixe, UUID, date du jour) et modes contextuels par type
- [ ] Règles de validation inter-champs avec types de règles (date_before/after, number_less/greater_than, required_if_filled)
- [ ] Badges d'indicateurs dans le tableau des champs

## Dépendances

- 6-3-2
