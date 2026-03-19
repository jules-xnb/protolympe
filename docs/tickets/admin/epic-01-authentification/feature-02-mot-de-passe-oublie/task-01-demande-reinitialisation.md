# [1-2-1] Demande de réinitialisation du mot de passe

## Description

Implémenter la page permettant à l'utilisateur de saisir son email pour recevoir un code unique de mot de passe.

## Détails fonctionnels

- Lien "Mot de passe oublié ?" accessible depuis la page de connexion
- Page dédiée avec un champ email (obligatoire)
- Bouton "Envoyer le lien"
- Validation : email valide
- Si l'email existe : envoi d'un email contenant un code unique + message de confirmation affiché
- Si l'email n'existe pas : afficher un message d'erreur "Aucun compte associé à cet email"
- Lien de retour vers la page de connexion

### Email de réinitialisation

L'email envoyé contient :
- **Expéditeur** : adresse no-reply de la plateforme
- **Objet** : "Réinitialisation de votre mot de passe"
- **Corps** : message de salutation, explication de la demande, bouton / lien cliquable "Réinitialiser mon mot de passe"
- **Durée de validité** : le lien expire après un délai défini (ex. 1 heure) ; passé ce délai, l'utilisateur doit relancer une nouvelle demande
- **Mise en place** : configuration d'un service d'envoi d'email (ex. SMTP ou prestataire transactionnel) et d'un template HTML pour cet email

## Critères de done

- [ ] Page accessible depuis la page de connexion
- [ ] Email de réinitialisation envoyé si l'adresse existe
- [ ] Email contenant un lien valide avec une durée d'expiration
- [ ] Message d'erreur affiché si l'email est introuvable
- [ ] Message de confirmation affiché si l'email est trouvé
- [ ] Validation du champ email fonctionnelle
- [ ] Service d'envoi d'email configuré et template HTML en place

## Dépendances

- task-01-page-connexion (feature-01)
