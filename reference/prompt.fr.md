Tu m'aides à remplir le formulaire « Demande de manifestation 2026 » de la Cité internationale universitaire de Paris (CIUP). Tu m'interroges sur mon événement, puis tu écris les données du formulaire en YAML avec les clés ci-dessous.

Déroulement :
1. Lis la description de mon événement à la fin de ce message et associe chaque information à une clé.
2. Interroge-moi : pose des questions sur chaque clé qui concerne mon événement et que ma description laisse ouverte, et sur tout ce qui enfreint une règle de la CIUP. Pose au plus 5 questions numérotées par message, dans la langue dans laquelle je t'écris. Quand tu peux deviner une réponse, propose-la pour que je n'aie qu'à confirmer (par ex. « Le même jour que le début ? »).
3. Recommence l'étape 2 jusqu'à ce que chaque clé qui concerne mon événement ait une valeur que j'ai donnée ou confirmée. Quand je ne sais pas encore, la valeur est `"TODO <ce qui manque>"`.
4. Réponds avec le YAML : un seul bloc de code ```yaml et rien d'autre. Quand je demande le YAML plus tôt, écris-le tout de suite, avec des valeurs TODO pour les points ouverts.

Règles du YAML :
- Chaque valeur vient de ce que j'ai écrit ou confirmé. Rédige les textes plus longs, comme `interet`, à partir de mes réponses et montre-moi le brouillon pour que je le confirme.
- Écris les valeurs en français.
- Cases à cocher : écris `true` pour les cases cochées ; laisse les autres de côté.
- Les clés qui ne concernent pas mon événement restent absentes (par ex. les champs d'exposition pour un concert).
- Dates au format `jj/mm/aaaa`, heures au format `19 h 30`.
- Le texte doit tenir : `maison`, `nom`, `lieu` en moins de 60 caractères ; `interet` en moins de 450 caractères ; `universites` en moins de 300 caractères.
- Règles de la CIUP : Les manifestations à la Cité sont gratuites ; pas de vente de billets ni d'alcool. Un artiste rémunéré ou un partenariat exige une convention (section 5) ; sinon, la section 5 reste absente.

Clés :

```yaml
# 1. Demandeur
maison: ""                     # ex. « Fondation Deutsch de la Meurthe »
nature_programmation: true     # Programmation culturelle, la CIUP est organisatrice
nature_partenariat: true       # Partenariat (convention obligatoire)
nature_residents: true         # Manifestation organisée par/pour les résidents (le cas le plus fréquent)
nature_interne: true

# 2. Informations sur l'événement
nom: ""                        # Nom de la manifestation
type_conference: true
conference_ouvert_oui: true
conference_ouvert_non: true
type_soiree: true              # Soirée dansante
soiree_interne: true           # Uniquement les résidents de la maison
soiree_externe: true           # Autres résidents / public extérieur
type_concert: true             # Programme obligatoire (Sacem) : remplir la page programme
concert_ouvert_oui: true
concert_ouvert_non: true
type_film: true
film_ouvert_oui: true
film_ouvert_non: true
type_exposition: true
expo_valeur: ""                # Valeur totale des œuvres
expo_nombre: ""                # Nombre d'œuvres
expo_type: ""                  # Photos, peintures…
type_autre: true
autre_precision: ""            # Autre : préciser
date_debut: ""                 # jj/mm/aaaa
date_fin: ""                   # jj/mm/aaaa (identique au début pour un seul jour)
heure_debut: ""                # ex. « 19 h 30 »
heure_fin: ""                  # ex. « 21 h 00 »
lieu: ""                       # Nom de la salle
assis: ""                      # Nombre de participants assis
debout: ""                     # Nombre de participants debout
entree_libre: true
entree_invitation: true
entree_gratuite: true
entree_payante: true           # Les manifestations à la Cité doivent être gratuites

# 3. Personnalités attendues
personnalites: ""              # Personnalités attendues, ou « Aucune »

# 4. Dispositifs et prestations
artiste_oui: true
artiste_non: true
remunere_oui: true
remunere_non: true
remunere_intermittent: true    # Déclaration GUSO
remunere_association: true     # Convention obligatoire
traiteur_accueil_cafe: true
traiteur_pause_cafe: true
traiteur_cocktail: true
traiteur_quantite: ""          # Nombre de personnes pour le traiteur

# 5. Informations tiers
tiers_nom: ""                  # Nom du tiers
tiers_signataire: ""           # Nom, prénom, fonction
tiers_email: ""                # E-mail du tiers
tiers_adresse: ""              # Adresse du tiers
tiers_infos: ""                # Autres informations

# 6. Intérêt de la manifestation
interet: ""                    # Objectifs culturels, éducatifs ou communautaires de la manifestation
universites: ""                # Universités / écoles des participants

# Concerts uniquement : programme pour la déclaration Sacem (page supplémentaire).
appendix:
  title: "Programme : <nom de l'événement>"
  intro: "<interprètes, durée>"
  columns: ["#", "Titre", "Compositeur(s) / auteur(s)"]
  col_widths: [25, 170, 300]
  rows:
    - ["1", "<titre>", "<compositeur / parolier>"]
```

Mon événement :

<Décrivez votre événement en quelques phrases, dans la langue de votre choix : quoi, qui se produit, quelle maison et quelle salle, date et heure, public attendu, gratuit ou non, morceaux/programme pour un concert, votre université.>