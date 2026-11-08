# Les petites aventures du Bocage

Un jeu éducatif dans un quartier illustré inspiré du Bocage à Onex, Genève. Les enfants créent leur personnage et découvrent des activités en se promenant et en discutant avec les habitants.

**[Jouer en ligne](https://r-c-hub.github.io/bocage/)**

![Le quartier du Bocage](docs/quartier.png)

## Jouer

- Flèches, ZQSD ou WASD : se déplacer. Des boutons directionnels sont aussi disponibles à l’écran.
- Sur téléphone ou tablette : posez le doigt sur la carte et faites-le glisser pour marcher (joystick virtuel ; plus on glisse loin, plus on va vite). La vue est rapprochée et suit le personnage. Le grand bouton vert indique avec qui parler ou dans quel lieu entrer.
- **E ou Entrée** : parler, jouer ou entrer, en étant à proximité.
- **Échap** : fermer un dialogue.
- Le préau permet d’entrer dans l’école. Les nouvelles pièces se trouvent dans son couloir.

Le jeu reste entièrement exploratoire : pas de liste de missions préaffichée ni de déplacement automatique.

## Activités

Personnage personnalisable et difficulté de 7 à 12 ans ; orientation, lecture de l’heure, durées et calculs ; anglais, allemand et italien ; jeu de passes avec les vrais personnages ; marelle ; bibliothèque avec histoires, coloriages sauvegardés, puzzles et révisions ; basket et mouvements ; piano, mélodies et rythmes.

Les histoires, les personnages et les intérieurs sont fictifs. Le plan est une interprétation simplifiée à partir de références, pas une cartographie exacte. Aucune photo Google Maps n’est intégrée.

Les données restent dans le navigateur : pseudo, âge, apparence, progression, coloriages, décoration et gamelles du chat. L’espace famille permet l’export et l’import d’une sauvegarde. La partie locale et la partie en ligne utilisent des espaces de stockage distincts ; utilisez l’export/import pour les transférer.

## Développement local

Ouvrez simplement **index.html** dans un navigateur en conservant **game.js** et **style.css** à côté. Aucun serveur, compte ou dépendance n’est nécessaire pour jouer.

Avec Node.js :

```sh
npm start
```

Contrôles et fichier autonome :

```sh
npm install
npm run check
npm test
npm run bundle
```

Les 52 contrôles utilisent un DOM simulé et une véritable implémentation Canvas. Ils ne remplacent pas une vérification des sons, des animations et du rendu dans chaque navigateur. Le fichier autonome est généré dans **outputs/Le-Bocage.html**.

## Publication

Site statique servi par GitHub Pages depuis la branche **gh-pages**, que le workflow **Previews des branches** (`.github/workflows/previews.yml`) remplit à chaque push :

- **main** est publiée à la racine : https://r-c-hub.github.io/bocage/
- chaque autre branche est publiée sous `branches/<nom-de-branche>/` (les `/` deviennent des `-`), par exemple https://r-c-hub.github.io/bocage/branches/claude-spinner-speed-100-percent-ptac1m/
- la liste des versions de test : https://r-c-hub.github.io/bocage/branches/

Une branche supprimée perd sa version de test. Réglage nécessaire une fois : Settings → Pages → Source « Deploy from a branch », branche **gh-pages**, dossier **/ (root)**.

[Guide complet](docs/GUIDE.md)

## Nouveautés 2.1

- Voie privée et stationnement entre la route du Grand-Lancy et l’école, d’après routes.png.
- Boutons piétons des deux côtés : E ou Entrée à proximité, attente de l’arrêt des voitures, puis dix secondes de vert. Hors du passage, la chaussée est bloquée avec un avertissement. Une traversée déjà engagée peut se terminer ; les voitures restent arrêtées jusqu’à sa fin. Le temps de jeu est suspendu dans les dialogues.
- Parc de l’autre côté : balançoire, cabane avec toboggan, tourniquet, de droite à gauche. Chaque jeu propose une petite animation avec le personnage.
- Ping-pong avec Lina, près de la table de la cour de l’école : glissez le doigt ou la souris (ou ← → / Q D) pour placer la raquette sous la balle ; le bord de la raquette vise sur le côté, bouger en frappant tape plus fort. Premier à 7 points ; Lina s’adapte à l’âge. Une étoile à la première victoire.
- Tirs au but avec Sami, au terrain de jeux : posez le doigt sur le ballon, glissez vers le but et lâchez. La direction vise, la longueur du geste règle la force (trop fort, la balle passe au-dessus). Sami plonge en devinant un côté, plus ou moins bien selon l’âge : visez les coins. 3 buts sur 5 tirs rapportent une étoile.
- Chez soi : approchez-vous de « Décorer ta chambre ». Ajoutez des meubles et jouets, choisissez leur couleur et placez-les sur les cases libres ; les couloirs restent dégagés. La décoration se sauvegarde automatiquement.
- Moustache vit chez soi : approchez-vous du chat pour servir des croquettes ou remplir sa gamelle d’eau. Les gamelles et la décoration sont incluses dans l’export/import.
- Zoom borné entre la vue globale et la vue proche centrée sur le personnage.
- Ping-pong et toboggan de la cour intervertis ; questions d’heure au format 24 h avec indication du moment de la journée.


### Animations du parc

Les trois jeux ont des scènes animées dessinées : balançoire avec chaînes fixées à la barre, siège et personnage articulé ; cabane avec montée de l’échelle, installation, glissade courbe et arrivée ; tourniquet en perspective avec le personnage et Sami, barres et plateau tournants. Les vêtements, cheveux, peau et yeux reprennent le personnage choisi. Chaque animation propose Pause, Reprendre et Recommencer.


La balançoire et le tourniquet se pilotent en continu : cliquez pour donner une impulsion, ou maintenez le bouton ↑ pour prendre de l’élan / accélérer. Le bouton ↓ freine. Les touches ↑ et ↓ fonctionnent aussi. Sans action, le mouvement ralentit naturellement ; la jauge indique l’élan / la hauteur ou la vitesse. Pause conserve la position ; Recommencer remet le jeu au départ.

Chacun a aussi un défi joué directement sur la scène. **Balançoire :** touchez la scène pour prendre de l’élan ; tout en haut du balancement, quand le cercle doré « Maintenant ! » apparaît, l’élan compte double. Attrapez les 5 étoiles placées de plus en plus haut. **Tourniquet :** glissez le doigt vers la gauche sur le tourniquet pour le pousser, vers la droite pour freiner, et gardez l’aiguille du compteur dans la zone verte pendant 3 secondes, pour trois vitesses différentes. Chaque défi réussi rapporte une étoile.


### Marelle interactive

La marelle propose un lancer de précision avec une zone adaptée à l’âge, des sauts à cloche-pied et à deux pieds sur les cases doubles, puis un retour avec ramassage du caillou. Cliquez sur le plateau ou les boutons numérotés ; les touches 1 à 8 sélectionnent aussi une rangée. Espace ou Entrée lance le caillou et permet de le ramasser. Les indices sont activables, et affichés au départ pour les 7–8 ans. Chaque nouvelle partie change la case du caillou.

Pour lancer le caillou, glissez le doigt vers le haut sur la marelle puis lâchez : la longueur du geste règle la distance, un arc en pointillés et une marque d’arrivée (verte sur la bonne case) guident le geste ; la barre de timing reste disponible. On saute en touchant la case suivante.
