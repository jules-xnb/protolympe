# [1-2-2] Page de réinitialisation du mot de passe

## Description

Implémenter la page permettant à l'utilisateur de définir un nouveau mot de passe après avoir cliqué sur le lien reçu par email.

## Détails fonctionnels

- Page accessible via le lien de réinitialisation envoyé par email (code dans l'URL)
- Champ code pin
- Champ "Nouveau mot de passe" (obligatoire)
- Champ "Confirmer le mot de passe" (obligatoire)
- Bouton "Réinitialiser le mot de passe"
- Validation : les deux champs doivent correspondre
- Si le token est invalide ou expiré : message d'erreur + lien pour faire une nouvelle demande
- En cas de succès : redirection vers la page de connexion avec message de confirmation

## Critères de done

- [ ] Page accessible uniquement via un token valide
- [ ] Token invalide ou expiré géré avec message d'erreur
- [ ] Mot de passe mis à jour avec succès
- [ ] Redirection vers la connexion après réinitialisation

## Dépendances

- task-01-demande-reinitialisation
