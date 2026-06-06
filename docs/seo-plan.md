# SEO-Plan whatsmoji.com

Eine Domain, Subdirectory-Split: `/` = EN, `/de/` = DE. Ein Repo, ein Deploy, ein CNAME.

## Output (`dist/`)

```
dist/
    index.html                      → /
    de/index.html                   → /de/
    emoji/<slug>/index.html         → /emoji/<slug>/         (×~1900)
    de/emoji/<slug>/index.html      → /de/emoji/<slug>/      (×~1900)
    sitemap.xml
    robots.txt
    CNAME                           "whatsmoji.com"
    manifest.json, sw.js
    favicon.ico, og-image.png, icon-192.png, icon-512.png
```

`<slug>` = kebab-case aus EN-Label, identisch in beiden Sprachen.

---

## Phase 1 — Basis-SEO

**`template.html` Head** pro Sprache befüllen via Platzhalter:
- `<html lang>` (`en` / `de`)
- `<title>`, `<meta name="description">`, `<link rel="canonical">`
- `hreflang`: `en` → `/`, `de` → `/de/`, `x-default` → `/`
- OG: `og:title`, `og:description`, `og:url`, `og:type=website`, `og:locale` (`en_US`/`de_DE`), `og:image`
- Twitter: `twitter:card=summary_large_image`
- JSON-LD `WebApplication` (top-level, schlank: `name`, `url`, `description`, `inLanguage`)

**Titles:**
- EN: `Whatsmoji — Instant Emoji Search & Copy (No Ads, No Tracking)`
- DE: `Whatsmoji — Sofort-Emoji-Suche & Kopieren (werbefrei)`

**Descriptions:**
- EN: `Find any emoji in 2 seconds. Type a word, click to copy. 1900+ emojis, no ads, no signup, works offline.`
- DE: `Jedes Emoji in 2 Sekunden finden. Wort tippen, Klick zum Kopieren. 1900+ Emojis, werbefrei, ohne Anmeldung, offline.`

**Weitere Pflicht-Änderungen:**
- `template.html:180` Tailwind-CDN-Script ersatzlos löschen (keine Tailwind-Klassen im Markup)
- `favicon.ico` ergänzen
- `og-image.png` (1200×630) ergänzen

---

## Phase 2 — Bilingualer Generator

**`template.html` Platzhalter:**
- Head: `{{LANG}}`, `{{TITLE}}`, `{{DESCRIPTION}}`, `{{CANONICAL}}`, `{{HREFLANG_*}}`, `{{OG_LOCALE}}`, `{{OG_URL}}`
- UI: `{{PLACEHOLDER}}`, `{{CLEAR_HISTORY}}`, `{{COUNT_LABEL_SINGULAR}}`, `{{COUNT_LABEL_PLURAL}}`, `{{COPIED}}`, `{{LANG_SWITCH_HREF}}`, `{{LANG_SWITCH_LABEL}}`

**`generate.mjs`:**

```js
const LOCALES = {
  en: { lang: 'en', path: '/',    outDir: 'dist',    strings: {...} },
  de: { lang: 'de', path: '/de/', outDir: 'dist/de', strings: {...} },
};
```

Schreibt pro Locale die Haupt-Page. Bilingualer Match bleibt — Such-Scoring läuft über `[...keywordsDe, ...keywordsEn]` auf beiden Pfaden.

**Sprach-Switch** im Footer als echtes `<a href>` (`/` ↔ `/de/`).

---

## Keyword-Daten pro Sprache (`keywords/{en,de}.json`)

Zwei separate Files im Repo. Schema:

```json
{
  "1F921": { "char": "🤡", "keywords": ["clown face", "scary clown", "pennywise"] }
}
```

- Key: emojibase `hexcode`
- `char`: nur zur Lesbarkeit beim Editieren (vom Generator ignoriert)
- `keywords`: **vollständige** Keyword-Liste für diese Sprache (kein Merge, kein Override)
- Sortiert nach hexcode

**`npm run seed-keywords`** (neuer Script-Modus): schreibt beide Dateien einmalig aus emojibase-Tags. Läuft nicht erneut, wenn Dateien existieren. Bei emojibase-Updates: ergänzt nur neue Hexcodes, lässt vorhandene unangetastet.

**`generate.mjs`** liest beide Files, ignoriert emojibase-Tags zur Laufzeit:

```js
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));
const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));
// pro Emoji:
{
  char: de.emoji,
  label: { en: en.label, de: de.label },
  keywordsEn: (kwEn[de.hexcode]?.keywords ?? []).map(s => s.toLowerCase()),
  keywordsDe: (kwDe[de.hexcode]?.keywords ?? []).map(s => s.toLowerCase()),
}
```

---

## Phase 3 — Emoji-Subpages

**Slug:** EN-Label → lowercase, Diakritika weg, Sonderzeichen weg, Spaces → `-`. Bei Kollision: hexcode-Suffix.

**`emoji-template.html`** (neu, ~3 kB, **ohne** die volle Emoji-DB):
- Großes Emoji oben, klickbar → Copy (Mini-Inline-JS)
- H1: Name (lokalisiert) + Emoji
- Meaning-Absatz (Label + ggf. emojibase `description`)
- Keyword-Pills: primär Sprache der Seite, sekundär andere Sprache
- Unicode-Codepoint
- "Related emojis" — 6–12 aus selber `group`/`subgroup` als `<a>`-Links → Subpages
- Back-Link zur Haupt-Suche
- hreflang Cross-Link zur anderen Sprach-Variante

**Title:**
- EN: `🤡 Clown Face Emoji — Copy & Meaning | Whatsmoji`
- DE: `🤡 Clown-Gesicht Emoji — Kopieren & Bedeutung | Whatsmoji`

**Generator:**
```js
for (const locale of Object.values(LOCALES)) {
  for (const emoji of emojis) {
    mkdirSync(`${locale.outDir}/emoji/${slug(emoji)}`, { recursive: true });
    writeFileSync(`${locale.outDir}/emoji/${slug(emoji)}/index.html`, renderEmojiPage(emoji, locale));
  }
}
```

**Sitemap:** simple `<url><loc>...</loc></url>` für alle ~3800 URLs. Keine Extensions, keine `lastmod`/`priority`.

**Haupt-App bleibt unverändert** — kein Cross-Link auf Subpages aus den Suchergebnissen.

---

## Dateien

| Datei | Aktion |
|---|---|
| `template.html` | Platzhalter, Meta-Tags, JSON-LD, Tailwind-CDN raus |
| `generate.mjs` | Beide Locales, Subpages, sitemap/robots/CNAME, liest `keywords/{en,de}.json` |
| `emoji-template.html` | **Neu** |
| `keywords/en.json` | **Neu**, via `seed-keywords` initial befüllt |
| `keywords/de.json` | **Neu**, via `seed-keywords` initial befüllt |
| `sw.js` | Subpages on-demand cachen (kein hartes ASSETS-Listing) |
| `package.json` | `seed-keywords`-Script ergänzen |
| `.gitignore` | `dist/` ergänzen |
| `og-image.png`, `favicon.ico` | **Neu**, statische Assets |

---

## Reihenfolge (Umsetzung)

1. Tailwind-CDN raus → smoke-test
2. `seed-keywords`-Script + initiale `keywords/{en,de}.json`
3. `generate.mjs` auf Locales + neue Keyword-Files umbauen, `dist/` als Output
4. `template.html` parametrisieren, Meta-Tags + JSON-LD + hreflang
5. Sprach-Switcher + DE-Strings
6. `robots.txt`, `sitemap.xml` (nur Haupt-Pages erstmal), `CNAME`
7. `emoji-template.html` + Subpage-Generierung
8. Sitemap auf alle Subpages erweitern
9. `og-image.png` + `favicon.ico`
10. `sw.js` anpassen, `.gitignore`, `package.json`

---

## Verifikation

- `npm run seed-keywords && npm run generate` läuft durch
- `npx serve dist`: `/`, `/de/`, `/emoji/clown-face/`, `/de/emoji/clown-face/` funktionieren
- Suche matched bilingual auf beiden Pfaden, Copy, Recents, PWA-Install funktionieren
- Lighthouse ≥ 95 Performance + SEO auf beiden Hauptseiten
- hreflang-Validator grün, OpenGraph-Preview rendert
- Sprach-Toggle wechselt sauber zwischen `/` und `/de/`

## Später (out-of-scope)

- `whatsmoji.de` registrieren + 301 auf `/de/`
- GitHub Action für Auto-Deploy nach `dist/`
- SW-Cache-Eviction-Strategie
- Search-Console anbinden, Keyword-Files datengetrieben erweitern
