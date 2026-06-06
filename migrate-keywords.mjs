#!/usr/bin/env node
// One-time migration script: converts old format (keywords array) to new format (name/synonyms/themes).
// Idempotent: can be run multiple times safely.
import { readFileSync, writeFileSync } from 'fs';

for (const [lang] of [['de'], ['en']]) {
    const path = `keywords/${lang}.json`;
    const data = JSON.parse(readFileSync(path, 'utf-8'));

    let migrated = 0;
    let alreadyNew = 0;

    for (const hexcode in data) {
        const entry = data[hexcode];

        // Check if already in new format
        if (entry.name && Array.isArray(entry.name)) {
            alreadyNew++;
            continue;
        }

        // Migrate old format to new format
        if (entry.keywords && Array.isArray(entry.keywords)) {
            entry.name = entry.keywords;
            entry.synonyms = [];
            entry.themes = [];
            delete entry.keywords;
            migrated++;
        }
    }

    writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
    console.log(`✓ keywords/${lang}.json — ${migrated} migrated, ${alreadyNew} already new format`);
}
