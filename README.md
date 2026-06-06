# emojis.coffee

Instant-Emoji-Suche für den deutsch/englischsprachigen Raum. Kein Login, keine Werbung, kein Framework.

**Kern-Versprechen:** Tippe ein Wort → Emoji erscheint → Klick → kopiert. Unter 2 Sekunden, immer.

## Architektur

```
template.html        Haupt-App (EN + DE via Platzhalter)
emoji-template.html  Emoji-Subpages (SEO, ~3800 Seiten)
generate.mjs         Baut dist/ aus Templates + emojibase-data
seed-keywords.mjs    Befüllt keywords/{en,de}.json einmalig aus emojibase-Tags
keywords/en.json     Keyword-Liste EN (editierbar, nie überschrieben)
keywords/de.json     Keyword-Liste DE (editierbar, nie überschrieben)
dist/                Generierter Output — nie direkt bearbeiten (gitignored)
```

```bash
npm run seed-keywords   # keywords/{en,de}.json initial befüllen (einmalig)
npm run generate        # dist/ neu bauen
npx serve dist          # lokal testen
```

**Deploy:** GitHub Actions → baut bei jedem Push → GitHub Pages.

**Stack:** Vanilla JS, kein Framework, kein Build-Tool. Alle Logik inline in den Templates.

**Daten:** emojibase `de/data.json` + `en/data.json` + `keywords/{en,de}.json` → bilingualer Keyword-Pool pro Emoji. 1900+ Emojis. Scoring: Exakt-Match 100 Pkt, startsWith 50, includes 10.

**Output:** `/` + `/de/` (Hauptseiten), `/emoji/<slug>/` + `/de/emoji/<slug>/` (~3800 Subpages), `sitemap.xml`, `robots.txt`, `CNAME`.

## Features (implementiert)

- Instant-Suche mit Scoring-Ranking, kein Submit nötig
- Bilinguale Keywords (DE + EN gleichwertig, locale-first)
- 1-Klick kopieren mit visuellem Feedback + Toast
- Sticky Header, kein Layout-Shift, kein Scrollbar-Jank
- Wordmark über der Suchleiste — weicht zurück wenn History vorhanden
- SEO: Meta-Tags, hreflang, OG, JSON-LD, Sitemap, Emoji-Subpages
- PWA: manifest.json + Service Worker (offline, on-demand caching)

## Roadmap (Priorität absteigend)

| Feature | Beschreibung |
|---|---|
| ~~Umlaut-Normalisierung~~ | ✅ "mude" → "müde", pre-normalisierter Cache |
| ~~Zuletzt benutzt~~ | ✅ Letzte ~12 Emojis via localStorage |
| ~~PWA~~ | ✅ manifest.json + Service Worker |
| ~~SEO / Subpages~~ | ✅ ~3800 Emoji-Subpages, Sitemap, hreflang |
| `og-image.png` + `favicon.ico` | Statische Assets noch ausstehend |
| Tippfehlertoleranz | Fuzzy Matching, damit 0-Treffer so gut wie nie vorkommt |
| Keyboard-Navigation | Pfeiltasten + Enter + Escape |
| 0-Treffer-Feedback | Vorschläge statt leere Seite |

## Prinzipien

- Geschwindigkeit vor Features — jede Funktion muss die Kernnutzung schneller machen
- Kein serverseitiger State — nur localStorage, nie Server
- Keine Werbung, nie
- DE und EN immer gleichwertig
