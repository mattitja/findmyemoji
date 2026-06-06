#!/usr/bin/env node
// Fix: Clear old themes and reapply clean ones
import { readFileSync, writeFileSync } from 'fs';

for (const lang of ['de', 'en']) {
    const keywordsPath = `keywords/${lang}.json`;
    const keywords = JSON.parse(readFileSync(keywordsPath, 'utf-8'));

    // Clear all themes
    for (const entry of Object.values(keywords)) {
        entry.themes = [];
    }

    // Reapply clean themes
    const themesPath = `themes/${lang}.json`;
    const themes = JSON.parse(readFileSync(themesPath, 'utf-8'));

    let totalApplied = 0;
    for (const [themeName, hexcodes] of Object.entries(themes)) {
        for (const hexcode of hexcodes) {
            if (keywords[hexcode]) {
                keywords[hexcode].themes.push(themeName);
                totalApplied++;
            }
        }
    }

    writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2) + '\n');
    console.log(`✓ keywords/${lang}.json — ${totalApplied} themes applied (all old ones cleared)`);
}
