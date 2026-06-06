#!/usr/bin/env node
// Phase 4: Smoke tests for keyword system
// Tests: literal searches, theme searches, synonym searches, cross-language
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));

const enMap = new Map(enData.map(e => [e.hexcode, e]));

// Build emoji list matching generate.mjs
const emojis = deData
    .filter(e => e.tags && e.tags.length > 0)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .map((de, i) => {
        const en = enMap.get(de.hexcode) ?? {};
        const deEntry = kwDe[de.hexcode] ?? { name: [], synonyms: [], themes: [] };
        const enEntry = kwEn[de.hexcode] ?? { name: [], synonyms: [], themes: [] };
        return {
            id: i,
            char: de.emoji,
            hexcode: de.hexcode,
            label: { en: en.label ?? de.label, de: de.label },
            nameDe: deEntry.name.map(s => s.toLowerCase()),
            synDe: deEntry.synonyms.map(s => s.toLowerCase()),
            themesDe: deEntry.themes.map(s => s.toLowerCase()),
            nameEn: enEntry.name.map(s => s.toLowerCase()),
            synEn: enEntry.synonyms.map(s => s.toLowerCase()),
            themesEn: enEntry.themes.map(s => s.toLowerCase()),
        };
    });

// Search implementation matching template.html
const SCORE = {
    n:  { exact: 100, starts: 50, includes: 10 },
    n2: { exact: 90,  starts: 45, includes: 9 },
    s:  { exact: 70,  starts: 35, includes: 7 },
    s2: { exact: 65,  starts: 32, includes: 6 },
    t:  { exact: 20,  starts: 10, includes: 2 },
    t2: { exact: 18,  starts: 9, includes: 2 },
};

function normalize(str) {
    return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
}

function scoreAgainst(list, word, weights) {
    let s = 0;
    for (const kw of list) {
        if (kw === word) s += weights.exact;
        else if (kw.startsWith(word)) s += weights.starts;
        else if (kw.includes(word)) s += weights.includes;
    }
    return s;
}

function searchEmojis(query, lang) {
    const words = normalize(query.toLowerCase().trim()).split(/\s+/);
    const isPrimary = lang === 'de';

    const scored = [];
    for (const e of emojis) {
        const n = isPrimary ? e.nameDe : e.nameEn;
        const n2 = isPrimary ? e.nameEn : e.nameDe;
        const s = isPrimary ? e.synDe : e.synEn;
        const s2 = isPrimary ? e.synEn : e.synDe;
        const t = isPrimary ? e.themesDe : e.themesEn;
        const t2 = isPrimary ? e.themesEn : e.themesDe;

        const pre = { n: n.map(normalize), n2: n2.map(normalize), s: s.map(normalize), s2: s2.map(normalize), t: t.map(normalize), t2: t2.map(normalize) };

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

// Test runner
let totalTests = 0;
let passedTests = 0;

function testQuery(query, lang, expectedEmojis, testName) {
    totalTests++;
    const results = searchEmojis(query, lang);
    const topChars = results.slice(0, 15).map(e => e.char);
    const found = expectedEmojis.every(expected => topChars.includes(expected));

    if (found) {
        passedTests++;
        console.log(`✓ ${testName} (${lang}): "${query}"`);
    } else {
        console.log(`✗ ${testName} (${lang}): "${query}"`);
        console.log(`  Expected: ${expectedEmojis.join('')}`);
        console.log(`  Got (top-15): ${topChars.join('')}`);
    }
}

console.log('\n=== Phase 4: Smoke Tests ===\n');

console.log('7.1 Wörtliche Suchen (dürfen nicht verwässern):');
testQuery('katze', 'de', ['🐱'], '7.1.1 DE katze');
testQuery('blume', 'de', ['🌷', '🌹', '🌻'], '7.1.2 DE blume');
testQuery('auto', 'de', ['🚗'], '7.1.3 DE auto');
testQuery('herz', 'de', ['❤️'], '7.1.4 DE herz');

testQuery('cat', 'en', ['🐱'], '7.1.5 EN cat');
testQuery('flower', 'en', ['🌷', '🌹', '🌻'], '7.1.6 EN flower');
testQuery('car', 'en', ['🚗'], '7.1.7 EN car');
testQuery('heart', 'en', ['❤️'], '7.1.8 EN heart');

console.log('\n7.2 Theme-Suchen (müssen Assoziations-Treffer liefern):');
testQuery('frühling', 'de', ['🌸', '🌷', '🌼', '🌻', '🌱', '🐝', '🦋'], '7.2.1 DE frühling');
testQuery('weihnachten', 'de', ['🎄', '🎅', '🎁', '☃️', '🦌', '🔔'], '7.2.2 DE weihnachten');
testQuery('müde', 'de', ['😴', '😪', '🥱', '💤', '🛌'], '7.2.3 DE müde');
testQuery('tiere', 'de', ['🐶', '🐱', '🐰', '🐹', '🦊', '🐻', '🐼'], '7.2.4 DE tiere');

testQuery('spring', 'en', ['🌸', '🌷', '🌼', '🌻', '🌱', '🐝', '🦋'], '7.2.5 EN spring');
testQuery('christmas', 'en', ['🎄', '🎅', '🎁', '☃️', '🦌', '🔔'], '7.2.6 EN christmas');
testQuery('tired', 'en', ['😴', '😪', '🥱', '💤', '🛌'], '7.2.7 EN tired');
testQuery('animals', 'en', ['🐶', '🐱', '🐰', '🐹', '🦊', '🐻', '🐼'], '7.2.8 EN animals');

console.log('\n7.3 Synonym/Slang-Suchen:');
testQuery('mieze', 'de', ['🐱'], '7.3.1 DE mieze');
testQuery('semmel', 'de', ['🥖'], '7.3.2 DE semmel');
testQuery('lol', 'en', ['😂', '💀', '🤣'], '7.3.3 EN lol');
testQuery('lit', 'en', ['🔥'], '7.3.4 EN lit');

console.log('\n7.4 Cross-Language-Suchen:');
testQuery('cat', 'de', ['🐱'], '7.4.1 DE cat (cross-lang)');
testQuery('katze', 'en', ['🐱'], '7.4.2 EN katze (cross-lang)');

console.log(`\n=== Results: ${passedTests}/${totalTests} tests passed ===\n`);

if (passedTests === totalTests) {
    console.log('✓ All tests passed!');
    process.exit(0);
} else {
    console.log(`✗ ${totalTests - passedTests} tests failed. Review keyword scoring.`);
    process.exit(1);
}
