# [5-4-2] Formulaire de création/édition d'un champ

## Description

Dialog de formulaire permettant de créer ou modifier un champ personnalisé avec configuration conditionnelle selon le type.

## Détails fonctionnels

- Dialog utilisé en mode création et édition
- Champs du formulaire :
  - **Nom** (requis) — le slug est auto-généré en création
  - **Type** (requis) — select groupé par catégorie (voir détail ci-dessous)
  - **Description** (optionnel, zone de texte)
  - **Longueur maximale** (conditionnel : affiché si type = text, textarea, email, phone, url)
  - **Référentiel** (conditionnel : affiché si type = liste ou liste multiple) — sélecteur avec barre de recherche (Popover + Command)
  - **Valeur par défaut** (conditionnel selon le type) :
    - Pour les listes (select) : picker searchable parmi les valeurs du référentiel
    - Pour les listes multiples (multiselect) : picker searchable avec sélection multiple + bouton "Tout effacer"
    - Pour les cases à cocher : toggle Coché/Non coché
  - **Objet référencé** (conditionnel : affiché si type = réf. objet) — sélecteur avec barre de recherche (Popover + Command), les BO archivés sont exclus. Option "Sélection multiple" ajoutée (toggle). Configuration d'affichage supprimée.
  - **Formule de calcul** (conditionnel : affiché si type = calculé, utilise l'éditeur de formule)
  - **Configuration document** (conditionnel : affiché si type = document) :
    - Fichiers multiples (toggle oui/non, coché par défaut)
    - Taille max par fichier en Mo (1-50)
    - Formats acceptés : cases à cocher (tous cochés par défaut). Message : "Décochez les formats que vous ne souhaitez pas accepter"
  - **Configuration référence** (conditionnel : affiché si type = référence) :
    - Champ source (référence) : sélection parmi les champs de référence disponibles (EO système, champs custom de type réf. EO / réf. utilisateur / réf. objet)
    - Champ à afficher : sélection parmi les champs de l'entité référencée (dépend du champ source choisi)
    - Éditable (toggle) : si activé, l'utilisateur final peut modifier la valeur directement depuis l'objet métier — la modification est répercutée sur l'entité source
  - **Requis** (toggle oui/non) — masqué pour les types checkbox, référence (aggregation) et calculated
  - **Valeur unique** (toggle oui/non) — masqué pour checkbox, document, référence et calculated
  - **Génération automatique** — masqué pour checkbox, document, référence et calculated. Modes contextuels par type :
    - text/textarea : compteur, valeur fixe, UUID, date du jour
    - number/decimal : compteur, valeur fixe
    - date/datetime : valeur fixe, date du jour
    - email/phone/url/time : valeur fixe uniquement
    - select/multiselect : valeur fixe uniquement, valeur choisie parmi les options du référentiel
    - user_reference : picker searchable des utilisateurs du client
    - eo_reference : picker searchable des entités organisationnelles
    - object_reference : picker searchable des instances du BO référencé (affiche le nom, pas l'ID)
  - **Validation inter-champs** : supporte text, textarea, email, phone, url, date, datetime, number, decimal, select, multiselect, checkbox. Règles :
    - date_before, date_after (pour date/datetime)
    - number_less_than, number_greater_than (pour number/decimal)
    - required_if_filled (pour tous)
- En édition, le formulaire est pré-rempli (y compris les configurations spécifiques au type)
- Les champs conditionnels sont réinitialisés si le type change et ne les requiert plus
- L'ordre d'affichage est calculé automatiquement en création (dernier + 1)

---

## Référence des types de champs

### Texte

#### Texte court
- **Saisie** : champ texte simple sur une ligne
- **Configuration** : nom, description, placeholder, longueur maximale, requis

#### Texte long
- **Saisie** : zone de texte multi-ligne
- **Configuration** : nom, description, longueur maximale, requis
- **Affichage lecture** : texte multi-ligne

#### Email
- **Saisie** : champ texte avec validation du format email
- **Configuration** : nom, description, placeholder, longueur maximale, requis

#### Téléphone
- **Saisie** : champ texte libre (pas de validation de format)
- **Configuration** : nom, description, placeholder, longueur maximale, requis

#### URL
- **Saisie** : champ texte libre
- **Configuration** : nom, description, placeholder, longueur maximale, requis
- **Affichage lecture** : lien cliquable ouvrant l'URL dans un nouvel onglet

### Nombre

#### Nombre entier
- **Saisie** : champ numérique (entiers uniquement)
- **Configuration** : nom, description, placeholder, requis

#### Nombre décimal
- **Saisie** : champ numérique avec décimales
- **Configuration** : nom, description, placeholder, requis

### Date/Heure

#### Date
- **Saisie** : sélecteur de date
- **Configuration** : nom, description, requis + **format d'affichage** (choix parmi : jj/mm/aaaa, mm/jj/aaaa, aaaa-mm-jj, jj mois aaaa)
- **Affichage lecture** : date formatée selon le format choisi (par défaut : jj/mm/aaaa)

#### Date et heure
- **Saisie** : sélecteur de date (la date est saisie côté formulaire)
- **Configuration** : nom, description, requis + **format d'affichage** (mêmes options que Date, avec l'heure ajoutée automatiquement)
- **Affichage lecture** : date et heure formatées selon le format choisi

#### Heure
- **Saisie** : champ de saisie horaire (format HH:MM)
- **Configuration** : nom, description, requis

### Choix

#### Case à cocher
- **Saisie** : toggle booléen (coché / non coché)
- **Configuration** : nom, description + **valeur par défaut** (toggle Coché/Non coché)
- **Affichage lecture** : "Oui" ou "Non"

#### Liste déroulante
- **Saisie** : sélection unique parmi les valeurs d'un référentiel
- **Configuration** : nom, description, requis + **sélecteur de référentiel** (obligatoire, barre de recherche Popover + Command) + **valeur par défaut** (picker searchable parmi les valeurs du référentiel)
- **Affichage lecture** : label de la valeur sélectionnée
- **Prérequis** : un référentiel doit être associé au champ

#### Liste à choix multiples
- **Saisie** : sélection multiple parmi les valeurs d'un référentiel
- **Configuration** : nom, description, requis + **sélecteur de référentiel** (obligatoire, barre de recherche Popover + Command) + **valeur par défaut** (picker searchable avec sélection multiple + bouton "Tout effacer")
- **Prérequis** : un référentiel doit être associé au champ

### Médias

#### Document (pièce justificative)
- **Saisie** : zone d'upload avec liste des fichiers déjà déposés, boutons télécharger et supprimer
- **Configuration** : nom, description, requis + **bloc configuration document** :
  - Fichiers multiples : autoriser le dépôt de plusieurs fichiers (coché par défaut)
  - Taille max par fichier : limite en Mo (1-50)
  - Formats acceptés : cases à cocher (tous cochés par défaut). Message : "Décochez les formats que vous ne souhaitez pas accepter"

### Références

#### Référence utilisateur
- **Saisie** : sélection parmi la liste des utilisateurs
- **Configuration** : nom, description, requis
- **Affichage lecture** : nom complet ou email de l'utilisateur
- **Option** : peut être auto-peuplé avec l'utilisateur courant à la création d'un objet

#### Référence entité organisationnelle
- **Saisie** : sélection parmi les entités organisationnelles accessibles
- **Configuration** : nom, description, requis
- **Affichage lecture** : "Nom de l'entité (CODE)"
- **Option** : peut être auto-peuplé avec l'entité de l'utilisateur courant à la création d'un objet

#### Référence objet métier
- **Saisie** : sélection parmi les instances de l'objet métier cible (affiche le numéro de référence)
- **Configuration** : nom, description, requis + **sélecteur d'objet métier référencé** (obligatoire, exclut l'objet courant, barre de recherche Popover + Command, BO archivés exclus) + **Sélection multiple** (toggle)
- **Affichage lecture** : numéro de référence de l'objet (ex : "INC-00001")
- **Prérequis** : un objet métier cible doit être associé au champ

### Avancé

#### Champ calculé
- **Saisie** : non éditable — valeur calculée automatiquement, affichée en lecture seule
- **Configuration** : nom, description + **éditeur de formule** (obligatoire, voir ticket 5-4-3)
- **Fonctions disponibles** :
  - Logique : si, et, ou, non, vide
  - Mathématiques : somme, moyenne, min, max, abs, arrondi
  - Texte : concat, majuscule, minuscule, longueur
  - Date : maintenant, aujourdhui, diff_jours
  - Conversion : texte, nombre, decimal, entier, booleen, date, format_date
- **Référence de champs** : `{slug_du_champ}` — tous les champs de l'objet peuvent être référencés, y compris les autres champs calculés
- **Note** : toujours en lecture seule (automatique)

#### Référence (lookup)
- **Principe** : affiche dans l'objet métier la valeur d'un champ provenant d'une entité référencée (EO, utilisateur ou autre objet métier). La valeur est résolue dynamiquement, pas stockée en double.
- **Saisie** : lecture seule par défaut. Si l'option "Éditable" est activée, l'utilisateur final peut modifier la valeur directement — la modification est répercutée sur l'entité source.
- **Configuration** : nom, description + **configuration de référence** :
  - Champ source (référence) : sélection parmi les champs de référence disponibles :
    - Entité organisationnelle (champ système)
    - Champs personnalisés de type réf. EO, réf. utilisateur ou réf. objet
  - Champ à afficher : sélection parmi les champs de l'entité référencée (la liste dépend du champ source sélectionné)
  - Éditable (toggle, désactivé par défaut) : permet à l'utilisateur final de modifier la valeur source depuis l'objet métier
- **Exemple** : un BO "Contrat" lié à une EO → champ référence sur l'EO → affiche le "Code postal" de l'EO. Si éditable, le code postal peut être modifié directement depuis le contrat.

---

## Critères de done

- [ ] Dialog fonctionnel en mode création et édition
- [ ] 18 types de champs disponibles, groupés par catégorie (Texte, Nombre, Date/Heure, Choix, Médias, Références, Avancé)
- [ ] Champs conditionnels affichés/masqués selon le type (référentiel, objet référencé, formule, config document, config référence)
- [ ] Longueur maximale affichée pour les champs texte (text, textarea, email, phone, url)
- [ ] Référentiel : sélecteur avec barre de recherche (Popover + Command)
- [ ] Valeur par défaut : picker searchable pour select, picker multi pour multiselect, toggle pour checkbox
- [ ] Objet référencé : sélecteur searchable, BO archivés exclus, option sélection multiple
- [ ] Config document : fichiers multiples et formats cochés par défaut, formats en cases à cocher
- [ ] Config date : choix du format d'affichage (4 options)
- [ ] Config référence : champ source (référence), champ à afficher, toggle éditable
- [ ] Requis masqué pour checkbox, référence et calculated
- [ ] Valeur unique masquée pour checkbox, document, référence et calculated
- [ ] Génération automatique : masquée pour checkbox/document/référence/calculated, modes contextuels par type
- [ ] Validation inter-champs : date_before/after, number_less/greater_than, required_if_filled
- [ ] Slug auto-généré en création
- [ ] Formule de calcul configurable via l'éditeur dédié
- [ ] Champ calculé toujours en lecture seule
- [ ] Ordre d'affichage auto-calculé en création

## Dépendances

- 5-4-1
