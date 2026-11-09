---
status: done
blocked_by: [03, 04]
---
# 09 Email and share

Spec: SPEC.md "Email", "What it does" step 6, "Non-goals" (no server email).

- Pure function building the `mailto:` URL from meta.yaml (recipient, subject `Demande de manifestation : {nom}, {date_debut}`, short French body: greeting, one-line event description, "formulaire et programme en pièce jointe", signature). Correct encoding (`encodeURIComponent`, `%20` not `+`, CRLF line breaks); keep total length under ~1800 chars by truncating the description.
- `#actions-panel`: "Email" button + a visible reminder right next to it to attach the downloaded PDF. "Share PDF" button shown only when `navigator.canShare({ files: [...] })` is true; shares the rendered PDF file.
- Tests: URL encoding, subject/body content, length cap, share-button feature detection.
