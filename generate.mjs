import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const BASE_URL = 'https://whatsmoji.com';

const LOCALES = {
    en: {
        lang: 'en',
        outDir: 'dist',
        canonical: `${BASE_URL}/`,
        title: 'Whatsmoji — Instant Emoji Search & Copy (No Ads, No Tracking)',
        description: 'Find any emoji in 2 seconds. Type a word, click to copy. 1900+ emojis, no ads, no signup, works offline.',
        ogLocale: 'en_US',
        switchHref: '/de/',
        switchLabel: 'Deutsch',
        strings: {
            clearHistory: 'clear my history',
            copied: 'copied',
            countSuffix: 'emojis',
            countSingular: 'result for',
            countPlural: 'results for',
            placeholder: 'e.g. smiley, cat, Fahrrad, Affe, rofl, :D...',
        },
    },
    de: {
        lang: 'de',
        outDir: 'dist/de',
        canonical: `${BASE_URL}/de/`,
        title: 'Whatsmoji — Sofort-Emoji-Suche & Kopieren (werbefrei)',
        description: 'Jedes Emoji in 2 Sekunden finden. Wort tippen, Klick zum Kopieren. 1900+ Emojis, werbefrei, ohne Anmeldung, offline.',
        ogLocale: 'de_DE',
        switchHref: '/',
        switchLabel: 'English',
        strings: {
            clearHistory: 'Verlauf löschen',
            copied: 'kopiert',
            countSuffix: 'Emojis',
            countSingular: 'Ergebnis für',
            countPlural: 'Ergebnisse für',
            placeholder: 'z.B. Smiley, Katze, bicycle, monkey, rofl, :D...',
        },
    },
};

// Build internal emoji list with bilingual keywords
const enMap = new Map(enData.map(e => [e.hexcode, e]));
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));
const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));

const emojis = deData
    .filter(e => e.tags && e.tags.length > 0)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .map((de, i) => {
        const en = enMap.get(de.hexcode) ?? {};
        return {
            id: i,
            char: de.emoji,
            hexcode: de.hexcode,
            label: { en: en.label ?? de.label, de: de.label },
            group: de.group ?? 0,
            subgroup: de.subgroup ?? 0,
            keywordsEn: (kwEn[de.hexcode]?.keywords ?? []).map(s => s.toLowerCase()),
            keywordsDe: (kwDe[de.hexcode]?.keywords ?? []).map(s => s.toLowerCase()),
        };
    });

function hreflangTags() {
    return [
        `<link rel="alternate" hreflang="en" href="${BASE_URL}/"/>`,
        `<link rel="alternate" hreflang="de" href="${BASE_URL}/de/"/>`,
        `<link rel="alternate" hreflang="x-default" href="${BASE_URL}/"/>`,
    ].join('\n    ');
}

function renderMainPage(locale) {
    const tpl = readFileSync('template.html', 'utf-8');

    const localeEmojis = emojis.map(e => ({
        id: e.id,
        char: e.char,
        label: e.label[locale.lang],
        keywords: locale.lang === 'de'
            ? [...new Set([...e.keywordsDe, ...e.keywordsEn])]
            : [...new Set([...e.keywordsEn, ...e.keywordsDe])],
    }));

    const dataScript = `const emojis = ${JSON.stringify(localeEmojis)};`;
    const stringsScript = `const STRINGS = ${JSON.stringify(locale.strings)};`;

    return tpl
        .replace('{{LANG}}', locale.lang)
        .replace('{{TITLE}}', locale.title)
        .replace('{{DESCRIPTION}}', locale.description)
        .replace('{{CANONICAL}}', locale.canonical)
        .replace('{{HREFLANG_TAGS}}', hreflangTags())
        .replace('{{OG_LOCALE}}', locale.ogLocale)
        .replace('{{OG_URL}}', locale.canonical)
        .replace('{{PLACEHOLDER}}', locale.strings.placeholder)
        .replace('{{LANG_SWITCH_HREF}}', locale.switchHref)
        .replace('{{LANG_SWITCH_LABEL}}', locale.switchLabel)
        .replace('/* EMOJI_DATA */', dataScript)
        .replace('/* STRINGS_DATA */', stringsScript);
}

// Write main pages
for (const locale of Object.values(LOCALES)) {
    mkdirSync(locale.outDir, { recursive: true });
    writeFileSync(`${locale.outDir}/index.html`, renderMainPage(locale));
    console.log(`✓ ${locale.outDir}/index.html — ${emojis.length} emojis (${locale.lang})`);
}

// robots.txt
writeFileSync('dist/robots.txt', [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    '',
].join('\n'));

// sitemap.xml — will be extended with emoji subpages in Phase 3
const sitemapUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/de/`,
];
const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
    '',
].join('\n');
writeFileSync('dist/sitemap.xml', sitemap);

// CNAME
writeFileSync('dist/CNAME', 'whatsmoji.com\n');

// Copy static assets
for (const asset of ['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'favicon.ico', 'og-image.png']) {
    if (existsSync(asset)) {
        copyFileSync(asset, `dist/${asset}`);
    }
}

console.log(`✓ robots.txt, sitemap.xml (${sitemapUrls.length} URLs), CNAME`);
