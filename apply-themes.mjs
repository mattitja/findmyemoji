#!/usr/bin/env node
// Apply theme memberships from themes/{de,en}.json to keywords/{de,en}.json
// Idempotent: can be run multiple times safely.
import { readFileSync, writeFileSync } from 'fs';

for (const lang of ['de', 'en']) {
    const themesPath = `themes/${lang}.json`;
    const keywordsPath = `keywords/${lang}.json`;

    const themes = JSON.parse(readFileSync(themesPath, 'utf-8'));
    const keywords = JSON.parse(readFileSync(keywordsPath, 'utf-8'));

    let totalApplied = 0;
    let totalDeduplicated = 0;

    for (const [themeName, hexcodes] of Object.entries(themes)) {
        for (const hexcode of hexcodes) {
            if (!keywords[hexcode]) {
                keywords[hexcode] = { char: '', name: [], synonyms: [], themes: [] };
            }

            // Check if theme already exists
            if (!keywords[hexcode].themes.includes(themeName)) {
                keywords[hexcode].themes.push(themeName);
                totalApplied++;
            } else {
                totalDeduplicated++;
            }
        }
    }

    writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2) + '\n');
    console.log(`✓ keywords/${lang}.json — ${totalApplied} themes added, ${totalDeduplicated} already present`);
}
