# Les petites aventures du Bocage

Un jeu éducatif dans un quartier illustré inspiré du Bocage à Onex, Genève. Les enfants créent leur personnage et découvrent des activités en se promenant et en discutant avec les habitants.

**[Jouer en ligne](https://r-c-hub.github.io/bocage/)**

![Le quartier du Bocage](docs/quartier.png)

## Jouer

- Flèches, ZQSD ou WASD : se déplacer. Des boutons directionnels sont aussi disponibles à l’écran.
- **E ou Entrée** : parler, jouer ou entrer, en étant à proximité.
- **Échap** : fermer un dialogue.
- Le préau permet d’entrer dans l’école. Les nouvelles pièces se trouvent dans son couloir.

Le jeu reste entièrement exploratoire : pas de liste de missions préaffichée ni de déplacement automatique.

## Activités

Personnage personnalisable et difficulté de 7 à 12 ans ; orientation, lecture de l’heure, durées et calculs ; anglais, allemand et italien ; jeu de passes avec les vrais personnages ; marelle ; bibliothèque avec histoires, coloriages sauvegardés, puzzles et révisions ; basket et mouvements ; piano, mélodies et rythmes.

Les histoires, les personnages et les intérieurs sont fictifs. Le plan est une interprétation simplifiée à partir de références, pas une cartographie exacte. Aucune photo Google Maps n’est intégrée.

Les données restent dans le navigateur : pseudo, âge, apparence, progression et coloriages. L’espace famille permet l’export et l’import d’une sauvegarde. La partie locale et la partie en ligne utilisent des espaces de stockage distincts ; utilisez l’export/import pour les transférer.

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

Les 35 contrôles utilisent un DOM simulé et une véritable implémentation Canvas. Ils ne remplacent pas une vérification des sons, des animations et du rendu dans chaque navigateur. Le fichier autonome est généré dans **outputs/Le-Bocage.html**.

## Publication

Site statique servi depuis la racine de la branche **main**, avec GitHub Pages. Le fichier **.nojekyll** désactive le traitement Jekyll. Un push sur main met à jour le jeu publié.

[Guide complet](docs/GUIDE.md)
