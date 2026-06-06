import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const BASE_URL = 'https://emojis.coffee';

const LOCALES = {
    en: {
        lang: 'en',
        outDir: 'dist',
        canonical: `${BASE_URL}/`,
        title: 'emojis.coffee — Instant Emoji Search & Copy (No Ads, No Tracking)',
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
        subpage: {
            titleSuffix: 'Emoji — Copy & Meaning | emojis.coffee',
            h1Suffix: 'Emoji',
            meaning: (label) => `${label} is an emoji used to express emotions, ideas, or objects visually in digital communication.`,
            backLabel: '← All emojis',
            keywordsLabel: 'Keywords',
            relatedLabel: 'Related emojis',
            copiedText: 'copied',
        },
    },
    de: {
        lang: 'de',
        outDir: 'dist/de',
        canonical: `${BASE_URL}/de/`,
        title: 'emojis.coffee — Sofort-Emoji-Suche & Kopieren (werbefrei)',
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
        subpage: {
            titleSuffix: 'Emoji — Kopieren & Bedeutung | emojis.coffee',
            h1Suffix: 'Emoji',
            meaning: (label) => `${label} ist ein Emoji, das in der digitalen Kommunikation genutzt wird, um Gefühle, Ideen oder Objekte visuell auszudrücken.`,
            backLabel: '← Alle Emojis',
            keywordsLabel: 'Keywords',
            relatedLabel: 'Verwandte Emojis',
            copiedText: 'kopiert',
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

// Capitalize: "clown face" → "Clown Face", "clown-gesicht" → "Clown-gesicht" (DE keeps native case)
function titleCase(str) {
    return str.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
}

// Slug: EN label → lowercase, strip diacritics, remove non-alphanum, spaces → '-'
function slugify(label) {
    return label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

// Build slug map with collision suffix
const slugMap = new Map();
for (const e of emojis) {
    const base = slugify(e.label.en);
    const slug = slugMap.has(base) ? `${base}-${e.hexcode.toLowerCase()}` : base;
    slugMap.set(e.hexcode, slug);
    if (slug === base) slugMap.set(base, true);
}

function getSlug(e) { return slugMap.get(e.hexcode); }

function hreflangTags() {
    return [
        `<link rel="alternate" hreflang="en" href="${BASE_URL}/"/>`,
        `<link rel="alternate" hreflang="de" href="${BASE_URL}/de/"/>`,
        `<link rel="alternate" hreflang="x-default" href="${BASE_URL}/"/>`,
    ].join('\n    ');
}

function emojiHreflangTags(slug) {
    return [
        `<link rel="alternate" hreflang="en" href="${BASE_URL}/emoji/${slug}/"/>`,
        `<link rel="alternate" hreflang="de" href="${BASE_URL}/de/emoji/${slug}/"/>`,
        `<link rel="alternate" hreflang="x-default" href="${BASE_URL}/emoji/${slug}/"/>`,
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

function renderEmojiPage(emoji, locale) {
    const tpl = readFileSync('emoji-template.html', 'utf-8');
    const sp = locale.subpage;
    const slug = getSlug(emoji);
    const rawLabel = emoji.label[locale.lang];
    const label = locale.lang === 'en' ? titleCase(rawLabel) : rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    const canonical = `${BASE_URL}${locale.lang === 'de' ? '/de' : ''}/emoji/${slug}/`;

    // related: same subgroup, exclude self, up to 12
    const related = emojis
        .filter(e => e.subgroup === emoji.subgroup && e.hexcode !== emoji.hexcode)
        .slice(0, 12);

    const primaryKws = locale.lang === 'de' ? emoji.keywordsDe : emoji.keywordsEn;
    const secondaryKws = locale.lang === 'de' ? emoji.keywordsEn : emoji.keywordsDe;

    const pillsHtml = (kws, cls) => kws
        .map(k => `<span class="pill${cls ? ' ' + cls : ''}">${k}</span>`)
        .join('');

    const relatedHtml = related
        .map(r => {
            const rSlug = getSlug(r);
            const rLabel = r.label[locale.lang];
            const rPath = locale.lang === 'de' ? `/de/emoji/${rSlug}/` : `/emoji/${rSlug}/`;
            return `<a href="${rPath}" title="${rLabel}">${r.char}</a>`;
        })
        .join('');

    const codepoint = 'U+' + emoji.hexcode.split('-').map(p => p.toUpperCase()).join(' U+');
    const titleName = `${emoji.char} ${label}`;
    const emojiDesc = `${label} emoji — ${locale.lang === 'de' ? 'Bedeutung, Keywords und verwandte Emojis' : 'meaning, keywords and related emojis'} | emojis.coffee`;

    return tpl
        .replace(/\{\{LANG\}\}/g, locale.lang)
        .replace(/\{\{TITLE\}\}/g, `${titleName} ${sp.titleSuffix}`)
        .replace(/\{\{DESCRIPTION\}\}/g, emojiDesc)
        .replace(/\{\{CANONICAL\}\}/g, canonical)
        .replace('{{HREFLANG_TAGS}}', emojiHreflangTags(slug))
        .replace('{{OG_LOCALE}}', locale.ogLocale)
        .replace(/\{\{EMOJI\}\}/g, emoji.char)
        .replace(/\{\{H1_TEXT\}\}/g, label)
        .replace('{{H1}}', `${label} ${sp.h1Suffix}`)
        .replace('{{MEANING}}', sp.meaning(label))
        .replace('{{CODEPOINT}}', codepoint)
        .replace('{{KEYWORDS_LABEL}}', sp.keywordsLabel)
        .replace('{{KEYWORDS_PRIMARY}}', pillsHtml(primaryKws, ''))
        .replace('{{KEYWORDS_SECONDARY}}', pillsHtml(secondaryKws, 'secondary'))
        .replace('{{RELATED_LABEL}}', sp.relatedLabel)
        .replace('{{RELATED_EMOJIS}}', relatedHtml)
        .replace(/\{\{BACK_LINK_HREF\}\}/g, locale.lang === 'de' ? '/de/' : '/')
        .replace(/\{\{BACK_LINK_LABEL\}\}/g, sp.backLabel)
        .replace('{{LANG_SWITCH_HREF}}', locale.switchHref)
        .replace('{{LANG_SWITCH_LABEL}}', locale.switchLabel)
        .replace('{{COPIED_TEXT}}', sp.copiedText);
}

// ── Main pages ──
for (const locale of Object.values(LOCALES)) {
    mkdirSync(locale.outDir, { recursive: true });
    writeFileSync(`${locale.outDir}/index.html`, renderMainPage(locale));
    console.log(`✓ ${locale.outDir}/index.html — ${emojis.length} emojis (${locale.lang})`);
}

// ── Emoji subpages ──
const allSubpageUrls = [];

for (const locale of Object.values(LOCALES)) {
    let count = 0;
    for (const emoji of emojis) {
        const slug = getSlug(emoji);
        const dir = `${locale.outDir}/emoji/${slug}`;
        mkdirSync(dir, { recursive: true });
        writeFileSync(`${dir}/index.html`, renderEmojiPage(emoji, locale));
        allSubpageUrls.push(`${BASE_URL}${locale.lang === 'de' ? '/de' : ''}/emoji/${slug}/`);
        count++;
    }
    console.log(`✓ ${locale.outDir}/emoji/ — ${count} subpages (${locale.lang})`);
}

// ── robots.txt ──
writeFileSync('dist/robots.txt', [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    '',
].join('\n'));

// ── sitemap.xml — all pages ──
const sitemapUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/de/`,
    ...allSubpageUrls,
];
const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
    '',
].join('\n');
writeFileSync('dist/sitemap.xml', sitemap);

// ── CNAME ──
writeFileSync('dist/CNAME', 'emojis.coffee\n');

// ── Static assets ──
for (const asset of ['manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'favicon.ico', 'og-image.png']) {
    if (existsSync(asset)) {
        copyFileSync(asset, `dist/${asset}`);
    }
}

console.log(`✓ robots.txt, sitemap.xml (${sitemapUrls.length} URLs), CNAME`);
