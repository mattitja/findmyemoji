# Keyword-System v2 — Themen + Synonyme + getiertes Scoring

**Status:** Plan, noch nicht umgesetzt.
**Sprachen:** DE + EN gleichwertig.
**Ziel:** Reichweite (Assoziations-Suchen wie „frühling" → 🌸🌷🐝☀️) ohne dass wörtliche Suchen verwässern.

---

## 1. Hintergrund & Designentscheidung

Aktueller Stand (`template.html:39-60`, `keywords/{de,en}.json`):

- Alle Keywords sind gleichwertig in einem flachen Array
- Scoring: exact=100, startsWith=50, includes=10
- Quelle: emojibase-Tags + Hand-Edits — fast nur **wörtliche** Bezeichnungen
- Folge: Assoziations-Suchen liefern fast nichts; jeder Versuch, mehr Keywords reinzukippen, verwässert wörtliche Suchen

**Lösung: 3-Tier-Keyword-Struktur mit differenziertem Scoring.**

| Tier | Bedeutung | Beispiel 🌸 | Score (exact / starts / includes) |
|---|---|---|---|
| 1 `name` | Was es **ist** (wörtlicher Name + direkte Synonyme) | "kirschblüte", "sakura", "blüte" | 100 / 50 / 10 |
| 2 `synonyms` | Andere Worte dafür, Slang, Kosenamen, Regiolekte | "rosa blume" | 70 / 35 / 7 |
| 3 `themes` | Wo es **dazugehört** (Kontext, Stimmung, Saison, Anlass) | "frühling", "japan", "natur", "rosa" | 30 / 15 / 3 |

**Effekt:** Bei „blume" rankt 🌷🌹🌻 (`name=blume`) über 🌸 (`synonyms=blüte`) über z.B. 🌺 (`themes=blume`-Verwandt). Bei „frühling" kommen ALLE Frühlings-Emojis, aber die mit „frühling" als stärkster Assoziation oben.

**Diese Anfangswerte sind großzügig** (Tier-3 mit 30 noch relativ hoch). Wenn Verwässerung bei Tests stark wird, Tier-3-exact auf 20 oder 15 senken.

---

## 2. Datenstruktur-Migration

### 2.1 Neue Schema-Form `keywords/{de,en}.json`

**Vorher:**
```json
{
  "1F338": {
    "char": "🌸",
    "keywords": ["kirschblüte", "blüte", "blume"]
  }
}
```

**Nachher:**
```json
{
  "1F338": {
    "char": "🌸",
    "name": ["kirschblüte", "sakura", "blüte"],
    "synonyms": ["rosa blume", "japanische blume"],
    "themes": ["frühling", "japan", "natur", "rosa"]
  }
}
```

Alle drei Felder sind Pflichtfelder als Array (auch wenn leer). Reihenfolge: `name`, `synonyms`, `themes`.

### 2.2 Migrations-Script `migrate-keywords.mjs` (NEU)

- Liest bestehende `keywords/{de,en}.json`
- Wenn ein Eintrag noch das alte Format hat (`keywords` als Array): kopiere `keywords` → `name`, lege `synonyms: []` und `themes: []` an
- Wenn schon neues Format: unverändert lassen
- Schreibe zurück (idempotent)
- Output: `✓ keywords/de.json — N Einträge migriert, M schon im neuen Format`

Diese Migration läuft EINMAL. Danach existiert das Script nicht mehr im Hot-Path — kann aber im Repo bleiben für Reproduzierbarkeit.

### 2.3 `seed-keywords.mjs` anpassen

Aktuell schreibt das Script `{char, keywords: [...]}`. Nach der Migration:
- Wenn ein Hexcode noch gar nicht existiert → neuer Eintrag mit `name: [tags...]`, `synonyms: []`, `themes: []`
- Bestehende Einträge NIE überschreiben (gleiche Garantie wie heute)

---

## 3. Scoring & Suche in `template.html`

### 3.1 `EMOJI_DATA` Struktur in `generate.mjs`

In `renderMainPage()` wird heute `localeEmojis` mit `keywords: [...]` als Mergeprodukt gebaut. Stattdessen:

```js
const localeEmojis = emojis.map(e => ({
    id: e.id,
    char: e.char,
    label: e.label[locale.lang],
    n: locale.lang === 'de' ? e.nameDe : e.nameEn,
    n2: locale.lang === 'de' ? e.nameEn : e.nameDe,     // andere Sprache → auch in name-Tier
    s: locale.lang === 'de' ? e.synDe  : e.synEn,
    s2: locale.lang === 'de' ? e.synEn : e.synDe,
    t: locale.lang === 'de' ? e.themesDe : e.themesEn,
    t2: locale.lang === 'de' ? e.themesEn : e.themesDe,
}));
```

**Wichtig (bilinguale Suche bleibt erhalten):** Die andere Sprache wird in Tier-1/2/3 mitgegeben, aber als separate Felder `n2/s2/t2`. So kann ein deutscher Nutzer „cat" tippen und 🐱 finden — der EN-`name=cat` matched in `n2`.

Kurze Feldnamen (`n/s/t/n2/s2/t2`) sparen Bytes im inline-JSON (relevant bei 1900 Emojis × jetzt 6 Arrays).

### 3.2 Geänderte `searchEmojis()` Funktion (`template.html:39-60`)

```js
const SCORE = {
    n:  { exact: 100, starts: 50, includes: 10 },   // primary name (locale)
    n2: { exact: 90,  starts: 45, includes: 9 },    // primary name (other locale)
    s:  { exact: 70,  starts: 35, includes: 7 },    // synonyms (locale)
    s2: { exact: 65,  starts: 32, includes: 6 },    // synonyms (other locale)
    t:  { exact: 30,  starts: 15, includes: 3 },    // themes (locale)
    t2: { exact: 28,  starts: 14, includes: 3 },    // themes (other locale)
};

function scoreAgainst(list, word, weights) {
    let s = 0;
    for (const kw of list) {
        if (kw === word) s += weights.exact;
        else if (kw.startsWith(word)) s += weights.starts;
        else if (kw.includes(word)) s += weights.includes;
    }
    return s;
}

function searchEmojis(query) {
    if (!query) return emojis;
    const words = normalize(query.toLowerCase().trim()).split(/\s+/);
    const scored = [];
    for (let i = 0; i < emojis.length; i++) {
        const e = emojis[i];
        const pre = normalizedCache[i]; // {n,n2,s,s2,t,t2} already-normalized arrays
        let score = 0;
        for (const word of words) {
            score += scoreAgainst(pre.n,  word, SCORE.n);
            score += scoreAgainst(pre.n2, word, SCORE.n2);
            score += scoreAgainst(pre.s,  word, SCORE.s);
            score += scoreAgainst(pre.s2, word, SCORE.s2);
            score += scoreAgainst(pre.t,  word, SCORE.t);
            score += scoreAgainst(pre.t2, word, SCORE.t2);
        }
        if (score > 0) scored.push({ emoji: e, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(x => x.emoji);
}
```

Der `normalizedKeywords`-Cache wird zu `normalizedCache` mit Objekt pro Emoji:
```js
const normalizedCache = emojis.map(e => ({
    n:  e.n.map(normalize),
    n2: e.n2.map(normalize),
    s:  e.s.map(normalize),
    s2: e.s2.map(normalize),
    t:  e.t.map(normalize),
    t2: e.t2.map(normalize),
}));
```

### 3.3 Optional: Top-Cap

Bei breiten Theme-Suchen („tiere") können >100 Treffer kommen. **Initial nicht limitieren** — der Sortier-Algorithmus erledigt das Ranking, der Nutzer scrollt. Wenn UX-Tests zeigen dass Listen >200 anstrengend werden, einbauen.

### 3.4 Subpage `emoji-template.html` — Keywords-Anzeige

Heute zeigt die Subpage zwei Pillen-Reihen: primary (locale-Sprache) und secondary (andere Sprache). Nach der Migration:
- Primary Pillen = `name` + `synonyms` der Locale-Sprache (sortiert, dedupliziert)
- Secondary Pillen = `name` + `synonyms` der anderen Sprache
- Themes optional als dritte, schwächer gestylte Pillen-Reihe darunter — entscheidet ein Folge-Task, **für diesen Plan: themes auf Subpages NICHT anzeigen** (Subpage-Layout bleibt unverändert)

Anpassung in `generate.mjs` (`renderEmojiPage`): `primaryKws` und `secondaryKws` werden aus `name + synonyms` der jeweiligen Sprache gebaut.

---

## 4. Themen-Töpfe (Tier 3)

Großzügiger Start: **~110 Themen pro Sprache**. Konzeptuell paarweise zwischen DE und EN, aber jede Sprache hat ihre eigene Liste — manche Konzepte existieren nur in einer Sprache (z.B. „feierabend" hat keine 1:1-EN-Entsprechung).

### 4.1 Regeln für Theme-Mitgliedschaft

Diese Regeln sind für das ausführende Modell **bindend**:

1. **Max 4 Themes pro Emoji.** Wenn 5+ in Frage kommen, die 4 stärksten Assoziationen wählen. (Lieber stark+kuratiert als großzügig+verwässert.)
2. **Mitgliedschaft = „Wenn jemand das Theme-Wort eintippt, wäre dieses Emoji eine plausible Antwort."** Test: Würde ein Nutzer der „weihnachten" tippt sich freuen, 🎄 zu sehen? Ja. 🌲 (Nadelbaum)? Auch ja — Grenzfall, drin lassen. 🦌? Ja (Rentier). 🍪 (Plätzchen)? Ja. ☃️ Schneemann? Ja. 🌟? Nein — zu generisch, wäre auch in „nacht", „erfolg" etc., das verwässert.
3. **Nicht in mehreren überlappenden Themes der gleichen Achse.** Beispiel: ein Emoji kann in „frühling" ODER „sommer" sein, nur dann in beiden wenn es wirklich zu beiden gleich stark passt (☀️ z.B. mehr „sommer").
4. **Keine schwachen Konzept-Themes.** Vermeide „ding", „objekt", „rund", „klein" — solche Themes haben keine echte Suchabsicht hinter sich.
5. **Farb-Themes nur, wenn die Farbe das definierende Merkmal ist.** 🔴 in „rot" — klar. 🍅 in „rot" — ja, das ist die Farbe. 🌹 in „rot" — ja. Aber nicht jedes überwiegend rote Emoji in „rot" reinwerfen.
6. **Theme-Größe als grobe Richtlinie**: 10-50 Mitglieder. Wenn ein Theme nur 3 Mitglieder hat, ist es zu eng. Wenn 100+, ist es zu unscharf — splitten oder Aufnahmekriterien verschärfen.

### 4.2 Themen-Liste DE (110 Themes)

**A. Jahreszeiten (4)**
`frühling`, `sommer`, `herbst`, `winter`

**B. Wetter & Klima (10)**
`regen`, `schnee`, `sonne`, `wolken`, `nebel`, `sturm`, `gewitter`, `hitze`, `kälte`, `wind`

**C. Tageszeit & Routine (8)**
`morgen`, `mittag`, `abend`, `nacht`, `frühstück`, `kaffeepause`, `feierabend`, `wochenende`

**D. Anlässe & Feste (14)**
`weihnachten`, `silvester`, `neujahr`, `ostern`, `halloween`, `valentinstag`, `muttertag`, `vatertag`, `geburtstag`, `hochzeit`, `taufe`, `abschluss`, `jubiläum`, `karneval`

**E. Stimmungen positiv (10)**
`glücklich`, `verliebt`, `stolz`, `dankbar`, `entspannt`, `aufgeregt`, `motiviert`, `lustig`, `süß`, `cool`

**F. Stimmungen negativ/komplex (14)**
`müde`, `traurig`, `wütend`, `gestresst`, `gelangweilt`, `peinlich`, `eklig`, `nervös`, `schüchtern`, `krank`, `verwirrt`, `enttäuscht`, `einsam`, `ängstlich`

**G. Beziehungen & Familie (8)**
`liebe`, `beziehung`, `familie`, `baby`, `kinder`, `eltern`, `freundschaft`, `trauer`

**H. Arbeit & Bildung (10)**
`arbeit`, `büro`, `meeting`, `homeoffice`, `schule`, `studium`, `lernen`, `prüfung`, `erfolg`, `niederlage`

**I. Sport & Bewegung (8)**
`sport`, `fitness`, `fußball`, `laufen`, `schwimmen`, `yoga`, `wintersport`, `outdoor`

**J. Hobbys & Kultur (8)**
`musik`, `gaming`, `lesen`, `kunst`, `kino`, `fotografie`, `basteln`, `tanzen`

**K. Reise & Orte (10)**
`reise`, `urlaub`, `strand`, `berge`, `stadt`, `land`, `camping`, `flugzeug`, `auto`, `zug`

**L. Essen & Trinken (10)**
`essen`, `süßes`, `dessert`, `gesund`, `fastfood`, `kaffee`, `tee`, `alkohol`, `grillen`, `backen`

**M. Tiere (6)**
`tiere`, `haustiere`, `vögel`, `meerestiere`, `insekten`, `wildtiere`

**N. Natur & Pflanzen (4)**
`natur`, `garten`, `blumen`, `wald`

**O. Tech & Digital (4)**
`technik`, `computer`, `internet`, `social media`

**P. Körper & Gesundheit (6)**
`körper`, `gesundheit`, `krankheit`, `beauty`, `schlafen`, `schwangerschaft`

**Q. Geld & Wirtschaft (3)**
`geld`, `finanzen`, `shopping`

**R. Internet-Slang / Mood-Begriffe (8)** — bewusst breit gehalten, weil sehr häufig gesucht
`cringe`, `mood`, `vibe`, `flex`, `slay`, `sus`, `lit`, `vibes`

**S. Farben (7)** — sparsam einsetzen, nur eindeutige Farb-Träger
`rot`, `gelb`, `grün`, `blau`, `rosa`, `schwarz`, `weiß`

**Total DE: 152.** Vor Umsetzung darf das ausführende Modell themes streichen, die sich beim Befüllen als zu eng (< 6 Mitglieder) oder zu weit (> 80 Mitglieder ohne sinnvolles Splitten) erweisen.

### 4.3 Themen-Liste EN (110 Themes)

Konzeptuell parallel zur DE-Liste. Wo ein Konzept fehlt oder zusätzlich existiert, ist das markiert.

**A. Seasons (4):** `spring`, `summer`, `autumn`, `winter`
*(„fall" als Synonym für „autumn" → siehe Synonyme-Sektion, nicht zwei Themes)*

**B. Weather (10):** `rain`, `snow`, `sun`, `clouds`, `fog`, `storm`, `thunderstorm`, `heat`, `cold`, `wind`

**C. Time & routine (8):** `morning`, `noon`, `evening`, `night`, `breakfast`, `coffee break`, `after work`, `weekend`

**D. Occasions & holidays (15):** `christmas`, `new year`, `easter`, `halloween`, `thanksgiving`, `valentines day`, `mothers day`, `fathers day`, `birthday`, `wedding`, `baptism`, `graduation`, `anniversary`, `carnival`, `independence day`
*(Thanksgiving + Independence Day sind US-spezifisch und ersetzen die DE-Karnevals-Region. Sinnvolle Anpassung an EN-Zielmarkt.)*

**E. Moods positive (10):** `happy`, `love`, `proud`, `grateful`, `relaxed`, `excited`, `motivated`, `funny`, `cute`, `cool`

**F. Moods negative/complex (14):** `tired`, `sad`, `angry`, `stressed`, `bored`, `embarrassed`, `disgusted`, `nervous`, `shy`, `sick`, `confused`, `disappointed`, `lonely`, `anxious`

**G. Relationships & family (8):** `love`, `relationship`, `family`, `baby`, `kids`, `parents`, `friendship`, `mourning`
*(„love" zweimal in der Liste — ist OK, ein Theme reicht, dedup im Mitglieder-Set ist die richtige Stelle. Behandle als ein Theme namens `love`.)*

**H. Work & education (10):** `work`, `office`, `meeting`, `remote work`, `school`, `college`, `study`, `exam`, `success`, `failure`

**I. Sports (8):** `sports`, `fitness`, `soccer`, `running`, `swimming`, `yoga`, `winter sports`, `outdoors`
*(„soccer" statt „football" — auch EN-Nutzer suchen oft mit „soccer", aber: `football` als Synonym in Tier 2, siehe Synonyme.)*

**J. Hobbies & culture (8):** `music`, `gaming`, `reading`, `art`, `cinema`, `photography`, `crafts`, `dancing`

**K. Travel & places (10):** `travel`, `vacation`, `beach`, `mountains`, `city`, `countryside`, `camping`, `airplane`, `car`, `train`

**L. Food & drink (10):** `food`, `sweets`, `dessert`, `healthy`, `fastfood`, `coffee`, `tea`, `alcohol`, `bbq`, `baking`

**M. Animals (6):** `animals`, `pets`, `birds`, `sea life`, `insects`, `wildlife`

**N. Nature & plants (4):** `nature`, `garden`, `flowers`, `forest`

**O. Tech & digital (4):** `tech`, `computer`, `internet`, `social media`

**P. Body & health (6):** `body`, `health`, `sickness`, `beauty`, `sleep`, `pregnancy`

**Q. Money & business (3):** `money`, `finance`, `shopping`

**R. Internet slang / mood (8):** `cringe`, `mood`, `vibe`, `flex`, `slay`, `sus`, `lit`, `vibes`

**S. Colors (7):** `red`, `yellow`, `green`, `blue`, `pink`, `black`, `white`

**Total EN: ~149.** Gleiche Streich-Regel wie DE.

### 4.4 Beispiel-Mitgliedschaften (kalibrieren das Modell)

Diese vier Beispiele zeigen dem ausführenden Modell, **wie eng oder weit** ein Theme zu fassen ist.

**`frühling`** (DE, ~25 Mitglieder erwartet):
- Pflanzen: 🌱🌷🌸🌼🌻🌺🌹🪻🪷🍀🌿☘️
- Tiere: 🐣🐤🐝🦋🐞🐛🦆
- Wetter: 🌦️🌈
- Sonstiges: 🥚🐰 (Osterhase-Assoziation), 🌧️ (Aprilwetter — Grenzfall, **nicht** drin lassen, sonst auch in „regen")
- **Nicht drin:** ☀️ (zu „sommer"), 🌳 (zu „natur"/„wald")

**`müde`** (DE, ~12 Mitglieder erwartet):
- 😴😪🥱😩😫😮‍💨🛌💤🌙
- Grenzfall: 🥺 (eher „traurig"), ☕ (eher „kaffee" — entsteht müdigkeitsweise per Synonym, nicht Theme)
- **Nicht drin:** 🧠 (kein Bezug), 🌃 (eher „nacht")

**`weihnachten`** (DE, ~20 Mitglieder erwartet):
- 🎄🎅🤶🧑‍🎄🎁🦌☃️⛄❄️🌟⭐🕯️🔔🧦🍪🍷🥂🎀🎶
- **Nicht drin:** 🌲 (Nadelbaum allgemein — Grenzfall, weglassen, sonst auch in „natur"), 🍷 (eher „alkohol" — Grenzfall, drin lassen wegen Festtags-Assoziation)

**`tiere`** (DE, ~80 Mitglieder erwartet — bewusst breit, das ist die Sammel-Suche):
- Alle Tier-Emojis (Säugetiere, Vögel, Reptilien, Fische, Insekten, Fabelwesen)
- **Nicht drin:** 🐾 Pfotenabdrücke (Grenzfall, drin lassen), 🦴 Knochen (eher „hunde"), Tier-Spielzeuge nicht
- Bei >80 splitten in `haustiere` / `wildtiere` / `vögel` etc. (diese existieren ja schon als eigene Themes)

---

## 5. Tier 2 — Synonyme & Slang

Tier-2 (`synonyms`) ist die Sprach-spezifische Reichhaltigkeit. Für jede Sprache eine separate Strategie.

### 5.1 DE-Synonyme — Kategorien & Beispiele

Das ausführende Modell soll für jede dieser Kategorien systematisch alle in Frage kommenden Emojis durchgehen und Synonyme hinzufügen:

**Kosenamen / Verniedlichungen:**
- 🐱 → "mieze", "miezekatze", "stubentiger"
- 🐶 → "hundi", "wauwau" (kindlich), "fellnase"
- ❤️ → "herzchen", "herzi", "schatz"
- 🐰 → "häschen", "hasi"

**Umgangssprache / Vulgärsprache:**
- 🤮 → "kotzen", "speien"
- 💩 → "scheiße", "kacke", "kacken"
- 😘 → "knutschen", "küsschen"
- 🍑 → "po", "arsch", "hintern", "popo"
- 🍆 → "schwanz" (Slang-Assoziation, drin lassen — Suche danach ist häufig)
- 🚽 → "klo", "klospülung", "scheißhaus"

**Regionale Varianten:**
- 🥖 → "brötchen", "semmel", "schrippe", "weckle", "wecken", "rundstück"
- 🥐 → "hörnchen", "kipferl"
- 🌭 → "wurst", "würstchen", "wienerle", "frankfurter"
- 🥨 → "brezel", "breze", "brezn"
- 🍺 → "bier", "halbe", "maß", "kaltes", "pils"

**Redewendungen / Gesten-Bedeutungen:**
- 🤞 → "daumen drücken", "viel glück"
- 🤦 → "kopf gegen wand", "facepalm", "verzweifeln"
- 🙏 → "danke", "bitte", "beten"
- 👍 → "fettes lob", "passt", "okay", "gut so"
- 🫶 → "love", "ich liebe es", "minihzerz"
- 🤝 → "deal", "abgemacht", "geschäft"
- 🧠 → "denken", "nachdenken", "grübeln"

**Slang / Jugendsprache:**
- 💀 → "ich bin tot" (Lachen-Slang), "lol", "umgefallen"
- 🔥 → "feuer" (positiv), "krass", "fett", "geil", "stark"
- ✨ → "fancy", "extra", "sparkle"
- 😂 → "lol", "lmao", "rofl", "lachen"
- 🥲 → "tränen lachen", "verkneifen"
- 🫠 → "geschmolzen", "ich kann nicht mehr"

**Funktional / Anwendung:**
- 📋 → "kopieren", "einfügen", "zwischenablage"
- ⚠️ → "achtung", "vorsicht", "warnung"
- ❌ → "falsch", "nein", "abgelehnt"
- ✅ → "richtig", "ja", "erledigt", "passt"

### 5.2 EN-Synonyme — Kategorien & Beispiele

**Affectionate / pet names:**
- 🐱 → "kitty", "kitten", "pussycat"
- 🐶 → "doggie", "doggo", "puppy", "pup"
- ❤️ → "heart", "sweetheart", "luv"
- 🐰 → "bunny", "bun"

**Slang / vulgar / euphemisms:**
- 🤮 → "puke", "barf", "throwing up"
- 💩 → "poop", "shit", "crap"
- 😘 → "kiss", "smooch", "mwah"
- 🍑 → "butt", "ass", "booty"
- 🍆 → "dick" (Slang-Assoziation), "eggplant"

**Regional / dialect:**
- ⚽ → "football", "footy" (UK), "soccer ball"
- 🍟 → "fries", "chips" (UK), "french fries"
- 🍪 → "cookie", "biscuit" (UK)
- 🚗 → "car", "automobile", "auto"

**Idioms / gesture meanings:**
- 🤞 → "fingers crossed", "good luck"
- 🤦 → "facepalm", "give up", "i cant"
- 🙏 → "thanks", "please", "praying"
- 👍 → "thumbs up", "ok", "approve", "like"
- 🫶 → "heart hands", "love this", "i love it"

**Slang / Gen-Z / internet:**
- 💀 → "im dead", "lol", "rip"
- 🔥 → "fire", "lit", "sick", "dope"
- ✨ → "fancy", "extra", "sparkle"
- 😂 → "lol", "lmao", "rofl", "crying laughing"
- 🥲 → "smiling tear", "holding back tears"
- 🫠 → "melting", "i cant even"
- 🧢 → "cap", "lie", "no cap"

**Functional / utility:**
- 📋 → "copy", "paste", "clipboard"
- ⚠️ → "warning", "caution", "alert"
- ❌ → "no", "wrong", "denied", "cross"
- ✅ → "yes", "right", "done", "check", "approved"

### 5.3 Arbeits-Strategie für Synonyme

Das ausführende Modell soll **kategorie-weise** vorgehen, nicht emoji-weise:

1. **Kategorie wählen** (z.B. „Essen & Trinken DE")
2. **Alle Emojis dieser Subgroup aus emojibase listen** (siehe `de.subgroup` Filter)
3. **Für jedes**: 0-5 Synonyme vorschlagen, nach den Beispielmustern
4. **In `synonyms`-Feld eintragen** im neuen Schema

**Hard limit:** max 8 Synonyme pro Emoji. Wenn mehr in Frage kommen, die häufigsten/eindeutigsten wählen.

---

## 6. Generierungs-Pipeline (Reihenfolge der Umsetzung)

### Phase 1 — Schema-Migration + Scoring (Code-Änderungen, NULL inhaltliche Arbeit)
1. `migrate-keywords.mjs` schreiben & einmal ausführen → `keywords/{de,en}.json` haben neues Schema (alle Tier-1 gefüllt aus alten `keywords`, Tier-2/3 leer)
2. `seed-keywords.mjs` an neues Schema anpassen
3. `generate.mjs` `renderMainPage` & `renderEmojiPage` an neues Schema anpassen (siehe Sektion 3.1, 3.4)
4. `template.html` `searchEmojis` und `normalizedCache` an neue Struktur anpassen (siehe Sektion 3.2)
5. **Akzeptanz Phase 1:** `npm run generate` läuft fehlerfrei, dist/ baut, Suche funktioniert genau wie vorher (Tier-2 und Tier-3 sind ja noch leer)

### Phase 2 — Themen befüllen (inhaltliche Arbeit)
1. Für jedes Theme aus Sektion 4.2 (DE): Mitglieder-Hexcodes generieren nach den Regeln aus 4.1
2. Ergebnis als `themes/de.json` schreiben: `{theme: [hexcode1, hexcode2, ...]}`
3. Merge-Script `apply-themes.mjs`: liest `themes/de.json`, fügt für jeden Hexcode den Theme-Namen in `keywords/de.json`'s `themes`-Array ein (deduplikation). Schreibt `keywords/de.json` zurück.
4. Gleiches für EN: `themes/en.json` → `keywords/en.json`
5. **Akzeptanz Phase 2:** Suche nach „frühling" (DE) liefert mindestens 🌸🌷🌼🌻🌱🐝🦋. Suche nach „blume" (DE) liefert 🌷🌹🌻 OBEN, nicht durch Themes verdrängt.

### Phase 3 — Synonyme befüllen (inhaltliche Arbeit)
1. Kategorie-weise vorgehen wie in 5.3 beschrieben
2. Direkt in `keywords/{de,en}.json` `synonyms`-Felder schreiben (kein Zwischen-File nötig, weil pro Emoji individuell)
3. **Akzeptanz Phase 3:** Suche nach „semmel" liefert 🥖. Suche nach „kotzen" liefert 🤮. Suche nach „mieze" liefert 🐱😺 ganz oben.

### Phase 4 — Visuelles Smoke-Test
1. `npm run generate && npx serve dist`
2. Test-Queries durchspielen (siehe Sektion 7)
3. Verwässerungs-Symptome beobachten und ggf. Tier-3-Scores nach unten anpassen (z.B. exact 30 → 20)

---

## 7. Akzeptanz-Tests (Test-Queries)

Das ausführende Modell soll diese Queries nach Phase 3 testen. Bei jeder Query müssen die erwarteten Treffer in den Top-N erscheinen.

### 7.1 Wörtliche Suchen — DARF NICHT verwässern

| Query (DE) | Top-3 muss enthalten | Verwässerungs-Symptom |
|---|---|---|
| `katze` | 🐱😺😸 | 🦁🐯 in Top-3 |
| `blume` | 🌷🌹🌻 | 🌸🌺 oberhalb 🌷 |
| `auto` | 🚗🚙🏎️ | 🛣️ Straße oberhalb |
| `pizza` | 🍕 (alleine) | irgendwas anderes oben |
| `herz` | ❤️🧡💛 | 💔 oder 💕 oberhalb |

| Query (EN) | Top-3 muss enthalten | Verwässerungs-Symptom |
|---|---|---|
| `cat` | 🐱😺😸 | 🦁🐯 in Top-3 |
| `flower` | 🌷🌹🌻 | 🌸🌺 oberhalb 🌷 |
| `car` | 🚗🚙🏎️ | 🛣️ road oberhalb |
| `heart` | ❤️🧡💛 | 💔 oberhalb |

### 7.2 Theme-Suchen — MÜSSEN Assoziations-Treffer liefern

| Query (DE) | Erwartet (Top-15 enthält) |
|---|---|
| `frühling` | 🌸🌷🌼🌻🌱🐝🦋🐣🐤 |
| `weihnachten` | 🎄🎅🎁☃️🦌🔔🕯️ |
| `müde` | 😴😪🥱💤🛌 |
| `arbeit` | 💼💻🖥️📊📋📈 |
| `tiere` | 🐶🐱🐰🐹🦊🐻🐼 (mind. 30 Treffer) |
| `liebe` | ❤️🥰😍💑💕💘 |
| `kaffeepause` | ☕🥐🍪 |

| Query (EN) | Erwartet (Top-15 enthält) |
|---|---|
| `spring` | 🌸🌷🌼🌻🌱🐝🦋 |
| `christmas` | 🎄🎅🎁☃️🦌🔔 |
| `tired` | 😴😪🥱💤🛌 |
| `work` | 💼💻🖥️📊📋 |
| `animals` | 🐶🐱🐰🐹🦊🐻🐼 (mind. 30 Treffer) |

### 7.3 Synonym/Slang-Suchen

| Query | Erwartet |
|---|---|
| `mieze` (DE) | 🐱 in Top-3 |
| `semmel` (DE) | 🥖 in Top-3 |
| `daumen drücken` (DE) | 🤞 in Top-3 |
| `kotzen` (DE) | 🤮 als Top-1 |
| `lol` (EN/DE) | 😂💀🤣 in Top-5 |
| `no cap` (EN) | 🧢 in Top-3 |
| `lit` (EN) | 🔥 in Top-3 |
| `fingers crossed` (EN) | 🤞 als Top-1 |

### 7.4 Cross-Language-Suchen (bilingual bleibt erhalten)

| Query | Auf DE-Seite | Auf EN-Seite |
|---|---|---|
| `cat` | 🐱 in Top-3 (über n2-Tier) | 🐱 in Top-1 |
| `katze` | 🐱 in Top-1 | 🐱 in Top-3 (über n2-Tier) |

---

## 8. Datei-Übersicht nach Umsetzung

```
keywords/
    de.json                 # 3-Tier-Struktur (name, synonyms, themes)
    en.json                 # 3-Tier-Struktur
themes/                     # NEU
    de.json                 # {theme: [hexcode...]} Quelldateien
    en.json                 # {theme: [hexcode...]} Quelldateien
migrate-keywords.mjs        # NEU, einmalig
apply-themes.mjs            # NEU, idempotent, jederzeit ausführbar
seed-keywords.mjs           # angepasst an neues Schema
generate.mjs                # angepasst an neues Schema, 6-Felder-EMOJI_DATA
template.html               # angepasst an 3-Tier-Scoring
```

**Versionierung:** alle `keywords/*` und `themes/*` Dateien in git, nie überschrieben, nur appended/edited.

---

## 9. Out-of-scope für diesen Plan

Bewusst NICHT Teil dieser Umsetzung — kann später, wenn Daten stehen:

- Fuzzy-Matching / Tippfehlertoleranz (Levenshtein)
- 0-Treffer-Feedback / Vorschläge
- Keyboard-Navigation
- Theme-Pillen auf Subpages anzeigen
- Auto-Suggest / Autocomplete

Diese Features profitieren VON dem neuen Keyword-System, brauchen es aber nicht zur Vorarbeit.

---

## 10. Performance-Erwägungen

- Aktuelle `EMOJI_DATA`-Größe: ~280-300KB inline JSON. Mit 6 statt 1 Keyword-Feld pro Emoji wächst das auf vielleicht ~400-500KB worst-case. **Akzeptabel** (Gzip komprimiert das stark, weil viele wiederholte Theme-Strings).
- Scoring-Loop: 6 statt 1 Array-Iteration pro Emoji. Bei 1900 Emojis × ~5 Tokens pro Query × 6 Arrays = ~57k Vergleiche. **Bleibt unter 5ms** auf jedem modernen Gerät. Falls Messung anders ausfällt → frühen Abbruch bei score-Threshold einbauen.
- Inline-JSON-Felder kurz halten (`n`, `s`, `t` statt `name`, `synonyms`, `themes`) — siehe 3.1.
