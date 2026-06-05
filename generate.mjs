import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const enMap = new Map(enData.map(e => [e.hexcode, e]));

const emojis = deData
    .filter(e => e.tags && e.tags.length > 0)
    .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
    .map((de, i) => {
        const en = enMap.get(de.hexcode) ?? {};
        const keywords = [...new Set([
            de.label.toLowerCase(),
            ...de.tags.map(t => t.toLowerCase()),
            en.label ? en.label.toLowerCase() : null,
            ...(en.tags ?? []).map(t => t.toLowerCase()),
        ].filter(Boolean))];

        return { id: i, char: de.emoji, label: de.label, keywords };
    });

const template = readFileSync('template.html', 'utf-8');
const dataScript = `const emojis = ${JSON.stringify(emojis)};`;
const output = template.replace('/* EMOJI_DATA */', dataScript);
writeFileSync('index.html', output);

console.log(`✓ index.html generiert — ${emojis.length} Emojis`);
