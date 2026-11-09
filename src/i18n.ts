/**
 * Interface strings (EN default, FR). Form labels come from meta.yaml and
 * warning texts from src/validation/messages.ts; everything else is here.
 * Panels take a `lang` option and look their strings up in `ui[lang]`.
 */
import type { Bilingual } from './forms/definition';

export type Lang = keyof Bilingual;

export const LANGS: readonly Lang[] = ['en', 'fr'];

const en = {
  page: {
    title: 'Event request form helper',
    unofficial:
      'Unofficial community helper made by residents. It is not a CIUP service, and the CIUP has not reviewed it.',
    privacy:
      'Private: everything happens in your browser. Nothing you type is sent anywhere, and there are no analytics. Your last draft is kept only on this device.',
    language: 'Language',
  },
  prompt: {
    heading: 'Option A: let a chatbot write the YAML',
    summary: 'Copy → paste into a chatbot → describe your event → paste the YAML below.',
    steps: [
      'Copy the prompt below.',
      'Paste it into any chatbot (ChatGPT, Le Chat, Claude…).',
      'Replace the last part with a description of your event, in any language, and send it.',
      'Paste the YAML it gives back into the box below.',
    ],
    boxLabel: 'Prompt for the chatbot',
    copy: 'Copy prompt',
    copied: 'Copied!',
    copyFailed: 'Could not copy automatically: the text is selected, press Ctrl+C (⌘C on Mac).',
  },
  yaml: {
    label: 'Paste the YAML here',
    hint: 'The form and the preview update as you paste or type. There is nothing to press.',
    loadExample: 'Load example',
    replaceConfirm: 'Replace your YAML with the example? What you pasted or typed will be lost.',
    clearDraft: 'Clear draft',
    clearConfirm: 'Clear the YAML and the form? This cannot be undone.',
    position: (line: number, column?: number) => `Line ${line}${column === undefined ? '' : `, column ${column}`}`,
    notMapping: 'The YAML must be a list of "key: value" lines (for example  nom: "Soirée").',
  },
  form: {
    heading: 'Option B: fill in the form',
    invalidNote: 'Fix the YAML error above to edit the form again.',
    pickDate: (label: string) => `${label}: pick a date`,
    addAppendix: 'Add programme page',
    removeAppendix: 'Remove programme page',
    title: 'Title',
    intro: 'Text before the table',
    outro: 'Text after the table',
    addRow: 'Add row',
    removeRow: 'Remove',
    cell: (row: number, column: string) => `Row ${row}, ${column}`,
  },
  preview: {
    heading: 'Preview',
    paused: 'Preview paused: fix the YAML error to update it.',
    failed: (error: string) => `Could not show the preview: ${error}`,
  },
  actions: {
    heading: 'Download and send',
    download: 'Download PDF',
    email: 'Email',
    emailReminder: 'Opens your mail app. Remember to attach the downloaded PDF.',
    share: 'Share PDF',
    fixYamlFirst: 'fix the YAML error first',
    pdfFailed: (error: string) => `Could not create the PDF: ${error}`,
    loadFailed: (error: string) => `Could not load the form PDF: ${error}`,
    renderProblem: (field: string, problem: string) => `Form layout problem, field "${field}": ${problem}`,
  },
};

export type UiStrings = typeof en;

const fr: UiStrings = {
  page: {
    title: 'Aide au formulaire de demande de manifestation',
    unofficial:
      "Outil communautaire non officiel, fait par des résidents. Ce n'est pas un service de la CIUP, et la CIUP ne l'a pas vérifié.",
    privacy:
      "Confidentiel : tout se passe dans votre navigateur. Rien de ce que vous saisissez n'est envoyé, et il n'y a aucune mesure d'audience. Votre dernier brouillon reste uniquement sur cet appareil.",
    language: 'Langue',
  },
  prompt: {
    heading: 'Option A : faire écrire le YAML par un chatbot',
    summary: 'Copier → coller dans un chatbot → décrire votre événement → coller le YAML ci-dessous.',
    steps: [
      'Copiez le prompt ci-dessous.',
      "Collez-le dans n'importe quel chatbot (ChatGPT, Le Chat, Claude…).",
      'Remplacez la dernière partie par une description de votre événement, dans la langue de votre choix, puis envoyez.',
      'Collez le YAML obtenu dans le champ ci-dessous.',
    ],
    boxLabel: 'Prompt pour le chatbot',
    copy: 'Copier le prompt',
    copied: 'Copié !',
    copyFailed: 'Copie automatique impossible : le texte est sélectionné, appuyez sur Ctrl+C (⌘C sur Mac).',
  },
  yaml: {
    label: 'Collez le YAML ici',
    hint: "Le formulaire et l'aperçu se mettent à jour dès que vous collez ou tapez. Aucun bouton à presser.",
    loadExample: "Charger l'exemple",
    replaceConfirm: "Remplacer votre YAML par l'exemple ? Ce que vous avez collé ou tapé sera perdu.",
    clearDraft: 'Effacer le brouillon',
    clearConfirm: 'Effacer le YAML et le formulaire ? Cette action est définitive.',
    position: (line, column) => `Ligne ${line}${column === undefined ? '' : `, colonne ${column}`}`,
    notMapping: 'Le YAML doit être une liste de lignes « clé: valeur » (par exemple  nom: "Soirée").',
  },
  form: {
    heading: 'Option B : remplir le formulaire',
    invalidNote: "Corrigez l'erreur YAML ci-dessus pour pouvoir modifier le formulaire.",
    pickDate: (label) => `${label} : choisir une date`,
    addAppendix: 'Ajouter la page programme',
    removeAppendix: 'Retirer la page programme',
    title: 'Titre',
    intro: 'Texte avant le tableau',
    outro: 'Texte après le tableau',
    addRow: 'Ajouter une ligne',
    removeRow: 'Supprimer',
    cell: (row, column) => `Ligne ${row}, ${column}`,
  },
  preview: {
    heading: 'Aperçu',
    paused: "Aperçu en pause : corrigez l'erreur YAML pour le mettre à jour.",
    failed: (error) => `Impossible d'afficher l'aperçu : ${error}`,
  },
  actions: {
    heading: 'Télécharger et envoyer',
    download: 'Télécharger le PDF',
    email: 'E-mail',
    emailReminder: "Ouvre votre messagerie. N'oubliez pas de joindre le PDF téléchargé.",
    share: 'Partager le PDF',
    fixYamlFirst: "corrigez d'abord l'erreur YAML",
    pdfFailed: (error) => `Impossible de créer le PDF : ${error}`,
    loadFailed: (error) => `Impossible de charger le PDF du formulaire : ${error}`,
    renderProblem: (field, problem) => `Problème de mise en page du formulaire, champ « ${field} » : ${problem}`,
  },
};

export const ui: Record<Lang, UiStrings> = { en, fr };
