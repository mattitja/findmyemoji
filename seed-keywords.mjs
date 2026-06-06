#!/usr/bin/env node
// Seeds keywords/{en,de}.json from emojibase tags.
// Never overwrites existing hexcodes — only appends new ones.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const enMap = new Map(enData.map(e => [e.hexcode, e]));

mkdirSync('keywords', { recursive: true });

for (const [lang, data] of [['de', deData], ['en', enData]]) {
    const path = `keywords/${lang}.json`;
    const existing = existsSync(path)
        ? JSON.parse(readFileSync(path, 'utf-8'))
        : {};

    let added = 0;
    for (const emoji of data) {
        if (!emoji.tags || emoji.tags.length === 0) continue;
        if (existing[emoji.hexcode]) continue;
        existing[emoji.hexcode] = {
            char: emoji.emoji,
            keywords: emoji.tags.map(t => t.toLowerCase()),
        };
        added++;
    }

    // also seed EN keywords for DE entries (bilingual search)
    if (lang === 'en') {
        for (const deEmoji of deData) {
            const enEmoji = enMap.get(deEmoji.hexcode);
            if (!enEmoji?.tags || enEmoji.tags.length === 0) continue;
            if (existing[deEmoji.hexcode]) continue;
            existing[deEmoji.hexcode] = {
                char: deEmoji.emoji,
                keywords: enEmoji.tags.map(t => t.toLowerCase()),
            };
            added++;
        }
    }

    const sorted = Object.fromEntries(
        Object.entries(existing).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`✓ keywords/${lang}.json — ${Object.keys(sorted).length} entries (${added} new)`);
}
