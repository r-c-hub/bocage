# Les petites aventures du Bocage — prototype 2.1, exploration libre

Ouvrez **index.html** à la racine des sources en conservant **game.js** et **style.css** à côté. Le fichier autonome **Le-Bocage.html** livré séparément permet aussi de jouer sans serveur ni installation.

## Jouer

Créez le personnage : pseudo, âge de 7 à 12 ans, fille ou garçon, coiffure, peau, cheveux, yeux, haut et pantalon. Promenez-vous avec les flèches, ZQSD ou WASD, ou en maintenant les boutons directionnels sous le jeu. Sur écran tactile, faites glisser le doigt sur la carte : un joystick apparaît sous le doigt. Les déplacements sont entièrement manuels.

Approchez-vous d’une personne ou d’une porte, puis appuyez sur **E ou Entrée**, sur **Parler / entrer**, ou cliquez sur la personne à proximité. **Échap** ferme un dialogue. Un clic au loin ne déclenche ni trajet ni conversation. Les boutons + et − règlent le zoom. Le vélo et la trottinette sont plus rapides ; à l’intérieur, le personnage marche.

Les activités se découvrent en rencontrant les habitants et en entrant dans les lieux. Il n’y a ni catalogue de missions, ni point d’exclamation au-dessus des habitants, ni raccourci vers un jeu. L’espace famille ne présente que les activités déjà rencontrées. Le carnet chez soi conserve uniquement les souvenirs d’activités réussies.

## Les activités de l’école

On peut entrer par la porte sous le préau, avec **E ou Entrée**. Dans le couloir, approchez-vous des portes : deux classes, bibliothèque, salle de sport et salle de musique. Pour revenir, approchez-vous de la sortie de chaque pièce ; vous retrouvez le couloir près de la porte utilisée.

- **Bibliothèque :** quatre histoires originales de trois pages, avec une question de compréhension ; deux cahiers de coloriage interactifs (maison et chat), palette, annulation et effacement ; puzzle coulissant ; neuf chapitres de révision en français, allemand et maths.
- **Coloriages :** sélectionnez une couleur puis une zone du dessin, au clic ou avec Tab et Entrée. Chaque couleur apparaît avec une petite animation. Les dessins sont conservés dans la sauvegarde locale et inclus dans l’export. Une remise à zéro de l’aventure efface aussi les coloriages.
- **Sport :** trois paniers de basket lancés au glisser (une position de plus en plus loin après chaque panier) et un circuit de consignes animées (sauter, s’accroupir, lever les bras). Il s’agit de commandes dans le jeu, sans caméra ni analyse des mouvements physiques de l’enfant.
- **Musique :** piano de huit notes, mélodies à écouter ou à suivre visuellement puis reproduire, et rythmes de sons courts et longs. La lecture sonore est déclenchée par le bouton d’écoute ; les indications visuelles permettent aussi de jouer sans son.
- **Marelle :** approchez-vous des cases peintes dans la cour, puis appuyez sur E ou Entrée. La marelle propose un lancer de précision avec une zone adaptée à l’âge, des sauts à cloche-pied et à deux pieds sur les cases doubles, puis un retour avec ramassage du caillou. Cliquez sur le plateau ou les boutons numérotés ; les touches 1 à 8 sélectionnent aussi une rangée. Espace ou Entrée lance le caillou et permet de le ramasser. Les indices sont activables, et affichés au départ pour les 7–8 ans. Chaque nouvelle partie change la case du caillou.
- **Football :** les deux joueurs animés reprennent le personnage créé et Sami, avec leurs vêtements, peau, cheveux et yeux, plutôt que des silhouettes génériques.

Ces activités restent accessibles depuis leurs lieux, sans catalogue global ni déplacement automatique. Les scènes intérieures sont des aménagements inventés pour le jeu.

## Corrections du garage et des abords

La capture `corrections/Entrée_garage.png` précise la couverture de l’entrée : une toiture à pans en tuiles orangées, assortie aux immeubles. Les jardins ont une profondeur augmentée de 8 unités de dessin et les accès aux portes restent dégagés. L’entrée du garage est sur sa face gauche : la rampe arrive depuis la gauche et la face inférieure est fermée. La route du chemin des Pampres conserve sa branche qui continue vers le bas entre les deux immeubles inférieurs. La boussole, la position du chat et les consignes utilisent ensemble le nouveau repère du nord.

## Carte et interface

La carte occupe désormais toute la page sous une barre supérieure de 48 px (44 px sur mobile). Le titre, les transports, les boutons directionnels et le zoom sont disposés en surimpression dans les coins. Le menu famille est accessible avec ⚙ et le bouton ⛶ permet de demander le plein écran.

Le zoom annoté `corrections/Ecole_zoom.png` complète la vue de référence : cour continue le long du côté droit de l’école, marelle dans la zone avant, jeux dans la zone arrière et préau à toit de tuiles au milieu. Le préau repose sur quatre poteaux et le personnage peut circuler dessous ; sa toiture devient transparente quand il s’y trouve.

## Ce qui est inclus

- Un quartier illustré en 2,5D avec des rangées de petits immeubles, des toits de tuiles orangées, jardins, haies, école, cours, stationnements et arrêt de bus.
- Des rencontres qui proposent de l’orientation, la lecture de l’heure, des durées, des calculs, des échanges en allemand, anglais ou italien, un jeu de ballon, un puzzle et une enquête.
- Trois paliers d’âge : 7–8, 9–10 et 11–12 ans. Les nombres, heures, durées, textes de langues, indices d’enquête et difficulté du puzzle changent selon le palier.
- Des dialogues variés avec des réponses au choix et des scènes animées : les deux personnages échangent, Noé montre sa montre et le joueur prend le chat dans ses bras. L’apparence choisie est conservée dans les scènes. Une erreur fournit un indice ; aucune étoile n’est retirée.
- Le chat retrouvé reste visible dans les bras du personnage pendant le retour auprès de Mia.
- Les deux immeubles au-delà du chemin des Pampres, dont celui du bas à gauche avec les façades et le toit en bardage à lamelles de bois clair, la table de ping-pong et le toboggan devant l’école, ainsi que la rampe d’entrée du garage, ajoutés d’après les annotations de `corrections/manque.png`. Ces équipements sont représentés dans le décor ; ils ne constituent pas de nouveaux mini-jeux dans cette version.
- Un plan repris selon `ecole_highlight.png` : école à gauche, route du Grand-Lancy en diagonale, groupes d’immeubles à droite et longue rangée de logements devant l’école. Les quatre blocs barrés sur la capture de corrections sont retirés de l’ancien plan.
- Une étoile à la première réussite de chaque mission. Les activités restent rejouables.
- L’entrée dans son appartement, la visite de deux classes, d’une bibliothèque, d’une salle de sport et d’une salle de musique à l’école, et une sonnette chez Inès et Tom. Les amis proposent une activité ; leur bureau permet aussi de travailler les calculs.
- Une sauvegarde automatique locale, un export et un import JSON, ainsi qu’une remise à zéro avec confirmation dans l’espace famille.
- Des sons de réussite facultatifs, désactivés au départ.

## Cadre de cette version

La vue de référence prioritaire est désormais **`ecole_highlight.png`**, complétée par `corrections/manque.png` pour les équipements et bâtiments manquants, et par la capture `corrections/Screenshot 2026-11-02 210645.png` pour identifier les immeubles à retirer. La disposition remplace l’ancien quadrillage. Les ailes de l’école, les rangées voisines, les deux bâtiments à toiture plate et les rues reprennent les groupes visibles sur cette vue ; les dimensions restent adaptées au jeu. Les photos au sol servent aux détails des façades. Les images d’origine ne sont ni modifiées ni affichées dans le jeu.

Le plan reste **une interprétation simplifiée, avec des proportions adaptées au jeu**. Ce n’est pas un relevé cadastral ni une reconstitution 3D exacte. Les logements attribués aux personnages, les intérieurs et les classes restent imaginaires. La vue n’est plus orientée avec le nord en haut : la boussole du jeu place N presque à gauche, environ 15 degrés au-dessus de l’horizontale, et E vers le haut, légèrement à droite. Le nord-est du jeu se situe entre les deux, vers le haut et la gauche de l’écran. Le placement du chat et les consignes ont été adaptés à ce repère. Cette orientation reste indicative, sans mesure géographique de l’angle de caméra.

Le temps des exercices est un temps de jeu : l’indication 17:45 est fixe, les montres présentent des heures tirées au sort selon l’âge, et l’enfant calcule les durées données dans les dialogues. Il ne s’agit pas de l’heure réelle de l’ordinateur.

Les niveaux sont indicatifs. L’âge ne suffit pas à déterminer les acquis d’un enfant : une validation avec un enseignant et, dans une prochaine version, un choix de classe et de niveau par matière permettront un réglage plus fin. L’italien est une découverte ; l’anglais reste accessible en découverte avant 10 ans.

Le jeu fonctionne seul, sans multijoueur, conversation libre, reconnaissance vocale ou intelligence artificielle en ligne. Les montres, durées, calculs et enquêtes sont générés à chaque rencontre et évitent les répétitions immédiates pendant la partie. Les langues disposent de 54 entrées (six par langue et par palier d’âge), proposées en ordre mélangé sans répétition avant la fin du groupe. Le bouton « Un autre défi » renouvelle l’exercice après une réussite. La question et sa bonne réponse restent fixes pendant un essai ; une erreur ne tire pas un nouvel exercice. Le puzzle est généré par des déplacements légaux et reste toujours résoluble.

La sauvegarde inclut désormais les coloriages et les nouvelles activités ; les anciennes sauvegardes restent lisibles. La sauvegarde dépend du stockage du navigateur. En navigation privée, après effacement des données ou déplacement du fichier, elle peut ne pas être conservée. Exportez-la depuis l’espace famille pour en garder une copie. Aucun service externe ne reçoit les données du jeu. Les deux liens documentaires de l’espace famille ouvrent les sites officiels uniquement si vous les choisissez.

## Vérification de livraison

Cinquante-huit contrôles vérifient la logique : absence de catalogue et de navigation automatique, déplacement au clavier, arrêt au relâchement, refus des interactions distantes, découverte progressive, accessibilité des portes et personnages, collisions, niveaux d’âge, réponses des exercices, retour manuel après la recherche du chat et sauvegarde. Les contrôles incluent la porte du préau, les trois nouvelles pièces, la lecture des histoires, les coloriages (peinture, annulation, effacement et sauvegarde), les chapitres de révision, les paniers, les mouvements, les mélodies, les rythmes, la marelle, et aussi Entrée et E, la route à gauche de l’école, les deux immeubles du bas, les équipements de jeux, la rampe du garage, la continuité de la cour et le passage sous le préau, les variantes de questions, leurs réponses cohérentes, la stabilité d’un exercice pendant les essais et les éléments des scènes. Les scènes du quartier ont été dessinées avec une véritable implémentation Canvas et les illustrations de dialogue rendues en SVG ; des aperçus du quartier et des scènes sont livrés à côté du jeu.

Le contrôle d’un navigateur local étant indisponible dans cette session, la disposition de l’interface sur chaque écran, les gestes tactiles, le téléchargement de sauvegarde et la lecture des animations et des sons dans le navigateur restent à confirmer sur votre appareil. Les contrôles de logique utilisent un DOM simulé, sans prétendre remplacer un essai complet dans un navigateur.

## Sources de repérage

- [Canton de Genève — Chemin du Bocage](https://noms-geographiques.app.ge.ch/voie/geneve/chemin-du-bocage) : voie du secteur de Belle-Cour.
- [Ville d’Onex — Établissements scolaires](https://www.onex.ch/mon-quotidien/vie-scolaire/etablissements-scolaires/) : école de Belle-Cour, route du Grand-Lancy 155.
- [DIP Genève — Prescriptions cantonales du cycle moyen](https://edu.ge.ch/enseignement/system/files/2023-06/prescriptions-cantonales-cm.pdf) : repères pédagogiques, notamment anglais dès la 7P.

## Sources du jeu et évolution

`index.html` contient la structure, `style.css` l’interface et `game.js` le monde et les activités. Les dessins sont générés en Canvas, sans bibliothèque ni dépendance distante.

Les étapes suivantes les plus utiles sont la cartographie réelle du quartier, davantage de situations et de variantes de questions, une adaptation par classe et par matière, des voix et un accompagnement audio, puis un essai avec des enfants et des enseignants. Une vraie version 3D demanderait un moteur et un travail de modélisation supplémentaire.

## Nouveautés 2.1

- Voie privée et stationnement entre la route du Grand-Lancy et l’école, d’après routes.png.
- Boutons piétons des deux côtés : E ou Entrée à proximité, attente de l’arrêt des voitures, puis dix secondes de vert. Hors du passage, la chaussée est bloquée avec un avertissement. Une traversée déjà engagée peut se terminer ; les voitures restent arrêtées jusqu’à sa fin. Le temps de jeu est suspendu dans les dialogues.
- Parc de l’autre côté : balançoire, cabane avec toboggan, tourniquet, de droite à gauche. Chaque jeu propose une petite animation avec le personnage.
- Ping-pong avec Lina, près de la table de la cour de l’école : glissez le doigt ou la souris (ou ← → / Q D) pour placer la raquette sous la balle ; le bord de la raquette vise sur le côté, bouger en frappant tape plus fort. Premier à 7 points ; Lina s’adapte à l’âge. Une étoile à la première victoire.
- Tri des déchets, au point de collecte à côté de l’école (devant les conteneurs, entre la voie privée et l’école) : faites glisser chaque déchet dans la bonne poubelle, ou touchez la poubelle. Sept poubelles selon les règles genevoises : verre, PET (bouteilles de boisson seulement), papier et carton, alu et fer-blanc, déchets de cuisine (P’tite poubelle verte), textiles et ordures ménagères. En cas d’erreur, la bonne poubelle s’allume et une explication s’affiche. Les plus grands ont plus de pièges (brique de lait, boîte à pizza grasse, assiette cassée…). 80 % de déchets bien triés du premier coup rapportent une étoile.
- Tirs au but avec Sami, qui attend avec son ballon sur la pelouse en bas du quartier (au sud du chemin des Pampres, à côté de l’allée du garage) : posez le doigt sur le ballon, glissez vers le but et lâchez. La direction vise, la longueur du geste règle la force (trop fort, la balle passe au-dessus). Sami plonge en devinant un côté, plus ou moins bien selon l’âge : visez les coins. 3 buts sur 5 tirs rapportent une étoile.
- Chez soi : approchez-vous de « Décorer ta chambre ». Ajoutez des meubles et jouets, choisissez leur couleur et placez-les sur les cases libres ; les couloirs restent dégagés. La décoration se sauvegarde automatiquement.
- Moustache vit chez soi : approchez-vous du chat pour servir des croquettes ou remplir sa gamelle d’eau. Les gamelles et la décoration sont incluses dans l’export/import.
- Zoom borné entre la vue globale et la vue proche centrée sur le personnage.
- Ping-pong et toboggan de la cour intervertis ; questions d’heure au format 24 h avec indication du moment de la journée.


### Animations du parc

Les trois jeux ont des scènes animées dessinées : balançoire avec chaînes fixées à la barre, siège et personnage articulé ; cabane avec montée de l’échelle, installation, glissade courbe et arrivée ; tourniquet en perspective avec le personnage et Sami, barres et plateau tournants. Les vêtements, cheveux, peau et yeux reprennent le personnage choisi. Chaque animation propose Pause, Reprendre et Recommencer.


La balançoire et le tourniquet se pilotent en continu : cliquez pour donner une impulsion, ou maintenez le bouton ↑ pour prendre de l’élan / accélérer. Le bouton ↓ freine. Les touches ↑ et ↓ fonctionnent aussi. Sans action, le mouvement ralentit naturellement ; la jauge indique l’élan / la hauteur ou la vitesse. Pause conserve la position ; Recommencer remet le jeu au départ.

Chacun a aussi un défi joué directement sur la scène. **Balançoire :** touchez la scène pour prendre de l’élan ; tout en haut du balancement, quand le cercle doré « Maintenant ! » apparaît, l’élan compte double. Attrapez les 5 étoiles placées de plus en plus haut. **Tourniquet :** glissez le doigt vers la gauche sur le tourniquet pour le pousser, vers la droite pour freiner, et gardez l’aiguille du compteur dans la zone verte pendant 3 secondes, pour trois vitesses différentes. Chaque défi réussi rapporte une étoile.
