# whatsmoji.com

Instant-Emoji-Suche für den deutsch/englischsprachigen Raum. Kein Login, keine Werbung, kein Framework. Eine HTML-Datei.

**Kern-Versprechen:** Tippe ein Wort → Emoji erscheint → Klick → kopiert. Unter 2 Sekunden, immer.

## Architektur

```
generate.mjs   Baut index.html aus template.html + emojibase-data (de + en, gemergt nach Hexcode)
template.html  Quellcode — hier werden Änderungen gemacht
index.html     Generierte Ausgabe — nie direkt bearbeiten
```

```bash
npm run generate   # index.html neu bauen
```

**Stack:** Vanilla JS, Tailwind CDN, kein Build-Tool. Alle Logik inline in template.html.

**Daten:** emojibase `de/data.json` + `en/data.json` → deduplizierter Keyword-Pool pro Emoji. 1900+ Emojis. Scoring: Exakt-Match 100 Pkt, startsWith 50, includes 10.

## Features (implementiert)

- Instant-Suche mit Scoring-Ranking, kein Submit nötig
- Bilinguale Keywords (DE + EN gleichwertig)
- 1-Klick kopieren mit visuellem Feedback + "copied" Toast
- Sticky Header, kein Layout-Shift, kein Scrollbar-Jank
- Wordmark "whatsmoji.com" über der Suchleiste — verschwindet wenn History vorhanden, gleiche Höhe → Suchleiste springt nie

## Roadmap (Priorität absteigend)

| Feature | Beschreibung |
|---|---|
| ~~Umlaut-Normalisierung~~ | ✅ "mude" → "müde", "ae/oe/ue" → Umlaute, pre-normalisierter Cache |
| ~~Zuletzt benutzt~~ | ✅ Letzte ~12 Emojis via localStorage, bei leerem Suchfeld sichtbar |
| ~~PWA~~ | ✅ manifest.json + Service Worker → installierbar, offline (icons noch ausstehend) |
| Tippfehlertoleranz | Fuzzy Matching, damit 0-Treffer so gut wie nie vorkommt |
| Keyboard-Navigation | Pfeiltasten + Enter + Escape |
| 0-Treffer-Feedback | Vorschläge statt leere Seite |
| Skin Tone Picker | Hautfarbe für Handgesten-Emojis |

## User Journeys

1. **Ziel-Emoji:** Öffnen → tippen → klicken → fertig
2. **Vibe-Emoji:** Stimmung eintippen ("müde", "aufgeregt") → browsen → klicken
3. **Wiederkehrend:** Letzte 12 kopierten Emojis erscheinen bei leerem Suchfeld
4. **Kein Treffer:** *(blocked on: Tippfehlertoleranz + 0-Treffer-Feedback)*

## Prinzipien

- Geschwindigkeit vor Features — jede Funktion muss die Kernnutzung schneller machen
- Kein serverseitiger State — nur localStorage, nie Server
- Keine Werbung, nie
- DE und EN immer gleichwertig
