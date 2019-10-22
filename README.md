# Distributed Build Your Block

## Objectif

Les buts de cette étape sont :

* Mettre en place un algorithme de consensus résistant aux utilisateurs malveillants.
* Introduire les notions de la *blockchain*.

## L'utilisateurs malveillants

Il existe dans la bibliographie de nombreux algorithmes de consensus résistants aux [noeuds byzantins](https://fr.wikipedia.org/wiki/Mod%C3%A8le_Byzantine_Altruistic_Rational), c.-à-d., pour faire simple, aux noeuds malveillants. Malheureusement, une grande partie d'entre eux nécessitent soit d'avoir un tiers de confiance soit de connaitre le nombre de participants. Hors, nous voulons un système où toute personne peut se joindre et sans tiers de confiance.

À l'étape précédente, nous avons vu un algorithme de consensus minimaliste permettant de résister à la latence et aux pannes réseaux mais pas à un utilisateur malveillant. Il suffit à un utilisateur malveillant de forger un message avec un horodatage *ad hoc* pour remplacer la valeur de son choix. Cette attaque est possible car l'horloge de chaque machine est indépendante de celle des autres. On ne peut pas garantir qu'un message a été forgé après un date donnée.

Une solution serait d'avoir une horloge partagée entre tous les participants. Une manière de faire cela, c'est d'enchainer les enregistrements : un enregistrement indique son prédécesseur. Le consensus revient à garder la chaine la plus longue. Cela simplifie aussi la détection de désynchronisation : il suffit de demander le dernier enregistrement d'un autre noeud. Nous voulons quelque-chose qui ressemble à ça :

     Enregistrement 0            Enregistrement 1     Enregistrement 2
    +-----------------------+   +----------------+   +----------------+
    |                       |   |                |   |                |
    | key: Enseignant       +<--+ key: Cours     +<--+ key: Etape     |
    | value: Damien Reimert |   | value: SYD     |   | value: 4       |
    |                       |   |                |   |                |
    +-----------------------+   +----------------+   +----------------+

L'illustration précédente soulève beaucoup de questions chez moi :

* Comment indiquer le prédécesseur ?

Il suffit de stocker l'identifiant du prédécesseur dans l'enregistrement comme on a stocké le timestamp.

* Comment identifier un enregistrement ?

On pourrait utiliser sa position dans la chaine d'enregistrement mais cette solution à un problème : elle ne permet pas de détecter une modification d'un enregistrement précédent.

* Hein ?

Si j'utilise uniquement la position ou l'index dans la chaine, je n'ai aucune information sur ce qui me précède. Je pourrais remplacer ce qu'il y a avant par n'importe quoi tant qu'il y a le bon nombre d'enregistrements. Pas très pratique pour mettre en place une horloge.

* Je peux stocker l'enregistrement dans ce cas ? J'aurai toute les informations !

Oui mais la taille des messages échangés va rapidement exploser : chaque message va contenir toute la base de donnée.

* À l'étape précédente, on a utilisé l'empreinte de la valeur pour vérifier qu'on avait la même valeur mais sans échanger cette valeur. On ne peut pas utiliser cette technique ?

Bonne idée !

* Simple alors, on calcule déjà l'empreinte de la valeur dans notre code, il faut juste ajouter un champ `previous` ?

Pas tout à fait. Si on se contente de l'empreinte de la valeur, qu'est-ce qui nous empêche de changer la clé ?

* Je mets la clé et la valeur dans la fonction de hachage ?

Non plus. Sinon, je peux modifier à ma guise le prédécesseur du block précédent.

* Ok, je vois. Dans la fonction de hachage, je mets tout ce que je veux non modifiable ?

Oui ! La seule chose dans un enregistrement que tu ne peux pas mettre dans la fonction de hachage, c'est l'empreinte elle-même, sinon tu as un problème d'oeuf et de poule.

Ha ! Et ajoute l'index de l'enregistrement dans la chaine. On pourrait le calculer mais ça permettra de simplifier des petites choses et ça nous coûte presque rien. Tu devrais avoir quelque-chose qui ressemble à ça maintenant :

     Enregistrement 0             Enregistrement 1        Enregistrement 2
    +-----------------------+    +-------------------+    +-------------------+
    |                       |    |                   |    |                   |
    | index: 0              |    | index: 1          |    | index: 2          |
    | id: <hash0>           +<-+ | id: <hash1>       +<-+ | id: <hash2>       |
    | previous: null        |  +-+ previous: <hash0> |  +-+ previous: <hash1> |
    | key: Enseignant       |    | key: Cours        |    | key: Etape        |
    | value: Damien Reimert |    | value: SYD        |    | value: 4          |
    |                       |    |                   |    |                   |
    +-----------------------+    +-------------------+    +-------------------+

* Ya des trucs bizarre sur l'enregistrement 0, son prédécesseur vaut `null`. C'est normal ?

Réfléchis...

* Le problème de l'oeuf et de la poule ? Il faut bien commencer quelque-part ?

Oui. Le premier enregistrement s'appelle le *genesis*, l'enregistrement avant lequel il n'y avait rien. C'est un axiome de votre système. Et en tant qu'axiome, il vaut mieux qu'il soit partagé par tous.

* Partagé par tous ? Je ne vois pas pourquoi ?

Je dirais bien, regarde l'histoire humaine mais ça ne va peut-être pas aider...

On pourrait laisser n'importe qui choisir le *genesis* de la chaine mais tout le monde va le faire et il va s'en suivre une longue période avant qu'il y ai convergence.

* Attend ! Il faut que je fasse un choix que j'impose aux autres ? Ça ressemble à un tiers de confiance ça...

Effectivement. Le code source que tu exécutes est un tiers de confiance si tu ne l'as pas vérifier. Le serveur sur lequel tu as téléchargé ce code est aussi un tiers de confiance. Mais la machine sur laquelle tu exécutes le code est aussi un tiers de confiance et je ne pense pas que tu l'as fabriqué toi-même.

Bon, oublie ça, il faut coder maintenant.

## Enchainez-les tous !

Résumons, il faut coder :

* une structure qui ressemble à ça :

       Enregistrement 0             Enregistrement 1        Enregistrement 2
      +-----------------------+    +-------------------+    +-------------------+
      |                       |    |                   |    |                   |
      | index: 0              |    | index: 1          |    | index: 2          |
      | id: <hash0>           +<-+ | id: <hash1>       +<-+ | id: <hash2>       |
      | previous: null        |  +-+ previous: <hash0> |  +-+ previous: <hash1> |
      | key: Enseignant       |    | key: Cours        |    | key: Etape        |
      | value: Damien Reimert |    | value: SYD        |    | value: 4          |
      |                       |    |                   |    |                   |
      +-----------------------+    +-------------------+    +-------------------+

* l'identifiant d'un enregistrement est le hachage de l'ensemble des éléments d'un enregistrement.
* l'algorithme de consensus est la chaîne la plus longue.
* pour détecter une désynchronisation, il suffit de demander le dernier enregistrement.

#### Implémentez la structure de données décrite.

#### Implémentez une commande `last` qui retourne le dernier enregistrement.

#### Implémentez une commande `record` qui retourne l'enregistrement à l'index fourni.

#### Mettez à jour l'algorithme de resynchronisation.

Normalement, si tout fonctionne, votre système est résistant aux utilisateurs mal informés ou incompétents mais pas aux utilisateurs malveillants.

Vous ne pensiez pas que serait aussi facile quand même ? Point positif, il ne reste presque rien à faire.

## Tout est une question de coûts

Imaginez une chaine d'une dizaine d'enregistrement. Un individu malveillant n'a qu'à partir du *genesis* et fabriquer une vingtaine d'enregistrements. Sa chaine étant plus longue que l'autre, elle remplacera la chaine existante. Pour éviter ça, il faudrait le ralentir mais sans empêcher les utilisateurs légitimes d'ajouter des éléments à la chaine d'enregistrements. Il faudrait mettre un coût à l'ajout d'enregistrement. Il existe une solution connu et largement utilisée : la preuve de travail.

## Preuve de travail

La preuve de travail n'est pas un algorithme de consensus. C'est la preuve d'un travail réalisé. Elle est couteuse à produire mais facile à vérifier, c.-à-d., que l'utilisateur va devoir dépenser des ressources en temps et en énergie pour la produire mais il va être beaucoup plus simple de la vérifier. Elle est utilisée dans de nombreuses conditions. Par exemple, dans l'envoie de mail pour limiter les spams en augmentant le coût d'envoie d'un mail.

La preuve de travail utilise les propriétés des fonctions de hachage. Il est impossible de prédire l'empreinte de quelque-chose sans faire le calcule. On fixe une condition sur cette empreinte, par exemple, qu'elle commence par un zero. La preuve va consister à trouver un *nombre magique* qui permet à l'empreinte de respecter la condition. Un des avantages est qu'il n'y a pas besoin de communiquer à l'avance avec l'interlocuteur pour lui fournir la preuve.

### Le nombre magique

L'empreinte est notre enregistrement est toujours la même sauf si notre enregistrement change. Malheureusement, pour un enregistrement donné, l'empreinte ne commence pas par zéro mais je ne peux pas modifier les champs de mon enregistrement sinon, il serait soit invalide si je modifie l'index ou le prédécesseur soit non conforme à ce que je veux faire si je modifie la clé ou la valeur.

C'est ici qu'intervient le *nombre magique*. On a vu qu'une petite modification entraine un changement important de l'empreinte. On va donc rajouter un nombre à la valeur sur laquelle on veut mettre notre preuve.

Prenons un exemple simple, je veux trouver une empreinte qui commence par zéro pour le couple `Enseignant / Damien Reimert` et j'ajoute un nombre :

```Bash
> echo "Enseignant / Damien Reimert / 0" | shasum
# cf3ee12420c29fbf13aff6d3397561735284366d  -
```

Il n'y a pas de zéro au début mais nous allons pouvoir incrémenter ce nombre.

#### Incrémenter le nombre jusqu'à obtenir une empreinte commençant par zero.

Vous venez de faire une preuve de travail et le nombre trouvé est le *nombre magique*.

## Prendre du temps pour s'insérer

Dans notre cas, imposons que l'identifiant d'un enregistrement commence par 3 zéros.

#### Ajouter un champ `nonce` dans la structure des enregistrements

#### Modifiez la commande `set` pour qu'elle vérifie que l'identifiant commence par 3 zéros

#### Modifiez le CLI pour qu'il incrémente le champ `nonce` jusqu'à respecter la contrainte quand l'utilisateur veut `set` une nouvelle clé.

Maintenant, chaque *enregistrement* demande du temps pour être produit.Tant que les utilisateurs légitimes insèrent des données, il va être difficiles à un attaquant de tenir le rythme pour produire une chaine plus longue.

## Conclusion

Vous venez de coder une blockchain. Un enregistrement est appelé *block*. L'ensemble des *blocks* forme la *blockchain*.

## Suite

Aller à l'étape 5 : `git checkout etape-5`.

Pour continuer à lire le sujet :

* soit vous lisez le fichier `README.md` sur votre machine.
* soit sur GitHub, au-dessus de la liste des fichiers, vous pouvez cliquer sur `Branch: master` et sélectionner `etape-5`.
