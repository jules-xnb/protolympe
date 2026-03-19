# [1-1-1] Page de connexion

## Référence Figma

- [connexion](https://www.figma.com/design/Iv0JzhpeVpx3fsKmw3E7Yu/Olympe?node-id=2-1118)

## Description

Implémenter la page d'authentification accessible à tous les utilisateurs non connectés. La page est divisée en deux colonnes : une zone de branding à droite (logo, titre, description de la plateforme) et un formulaire de connexion à gauche.

## Détails fonctionnels

- Champ email (obligatoire)
- Champ mot de passe (obligatoire)
- Bouton "Se connecter"
- Validation : email valide, mot de passe renseigné
- Gestion des erreurs :
  - "Email ou mot de passe incorrect" si credentials invalides
- Redirection vers la page clients en cas de succès
- Si l'utilisateur est déjà connecté, rediriger automatiquement vers la page clients

## Critères de done

- [ ] Page accessible sur `/auth`
- [ ] Connexion fonctionnelle avec redirection vers la page clients
- [ ] Tous les cas d'erreur affichent un message compréhensible
- [ ] Utilisateur déjà connecté redirigé automatiquement

## Dépendances

- Aucune
