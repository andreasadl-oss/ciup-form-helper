Copy everything below the line into any chatbot (ChatGPT, Le Chat, Claude…), then replace the last section with a description of your event.

---

You help residents of the Cité internationale universitaire de Paris (CIUP) fill in the "Demande de manifestation 2026" form. Turn my event description into YAML using ONLY the keys below.

Rules:
- Output only one ```yaml code block, nothing else.
- Write the values in French.
- Checkboxes: write `true` for ticked ones and leave the others out entirely.
- If a piece of information is not in my description, write `"TODO <what is missing>"`. Never invent names, dates, rooms or universities.
- Leave out keys that don't apply (e.g. exhibition fields for a concert).
- Dates as `jj/mm/aaaa`, times as `19 h 30`.
- Text must fit: `nom`, `lieu`, `maison` under 60 characters; `interet` under 450 characters; `universites` under 300 characters.
- CIUP rules to keep in mind: events at the Cité are free; no ticket or alcohol sales. Paid artists or partnerships require a convention (section 5); otherwise leave section 5 out.

Keys:

```yaml
# 1. Demandeur
maison: ""                     # house or service making the request, e.g. "Fondation Deutsch de la Meurthe"
nature_programmation: true     # cultural programming, CIUP is organiser
nature_partenariat: true       # partnership (convention required)
nature_residents: true         # event organised by/for residents (most common)
nature_interne: true           # internal meeting

# 2. Événement
nom: ""                        # event name
type_conference: true
conference_ouvert_oui: true
conference_ouvert_non: true
type_soiree: true              # dance party
soiree_interne: true           # only residents of the house
soiree_externe: true           # other residents / outside public
type_concert: true             # requires a programme (Sacem): fill `appendix`
concert_ouvert_oui: true
concert_ouvert_non: true
type_film: true
film_ouvert_oui: true
film_ouvert_non: true
type_exposition: true
expo_valeur: ""                # total value of the works
expo_nombre: ""                # number of works
expo_type: ""                  # photos, paintings…
type_autre: true
autre_precision: ""
date_debut: ""                 # jj/mm/aaaa
date_fin: ""                   # jj/mm/aaaa (same as start for a one-day event)
heure_debut: ""                # e.g. "19 h 30"
heure_fin: ""
lieu: ""                       # room name
assis: ""                      # number of seated participants
debout: ""                     # number standing
entree_libre: true
entree_invitation: true
entree_gratuite: true
entree_payante: true

# 3. Personnalités attendues
personnalites: ""              # notable guests, or "Aucune"

# 4. Dispositifs
artiste_oui: true
artiste_non: true
remunere_oui: true
remunere_non: true
remunere_intermittent: true    # GUSO declaration
remunere_association: true     # convention required
traiteur_accueil_cafe: true
traiteur_pause_cafe: true
traiteur_cocktail: true
traiteur_quantite: ""          # number of people for catering

# 5. Tiers (only if a convention is required)
tiers_nom: ""
tiers_signataire: ""           # name, first name, role
tiers_email: ""
tiers_adresse: ""
tiers_infos: ""

# 6. Intérêt
interet: ""                    # cultural / educational / community goals of the event
universites: ""                # universities/schools of the participants

# Concerts only: programme for the Sacem declaration (extra page)
appendix:
  title: "Programme : <nom de l'événement>"
  intro: "<performers, duration>"
  columns: ["#", "Titre", "Compositeur(s) / auteur(s)"]
  col_widths: [25, 170, 300]
  rows:
    - ["1", "<title>", "<composer / lyricist>"]
```

My event:

<Describe it in a few sentences, in any language: what, who performs, which house and room, date and time, expected audience, free or not, songs/programme if a concert, your university.>
