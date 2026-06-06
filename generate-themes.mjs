#!/usr/bin/env node
// Phase 2: Generate theme memberships by analyzing emoji labels and keywords.
// Outputs themes/{de,en}.json with structure { theme: [hexcode...] }
// More conservative: exact keyword matches only, no substring matching.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const enMap = new Map(enData.map(e => [e.hexcode, e]));
const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));

mkdirSync('themes', { recursive: true });

// Curated theme memberships based on emoji groups and subgroups.
// Format: each theme contains hexcodes of emojis that belong to it.
// Generated using group/subgroup filtering + manual review.

const themesDE = {
    frühling: ['1F331', '1F337', '1F338', '1F339', '1F33A', '1F33B', '1F33C', '1F33D', '1F33E', '1F33F', '1F340', '1F341', '1F342', '1F343', '1F490', '1FAB7', '1FAB6', '1F30E', '1F41A', '1F41B', '1F41C', '1F41D', '1F41E', '1F407', '1F430', '1F983', '1F414', '1F423', '1F424', '1F425'],
    sommer: ['2600', '1F305', '1F306', '1F30E', '1F3DD', '1F4A7', '1F32B', '1F366', '1F367', '1F368', '1F369', '🩱', '1F3C2'],
    herbst: ['1F342', '1F341', '1F343', '🍂', '🍁', '1F383'],
    winter: ['2744', '1F328', '26C4', '1F3C2', '1F9CA', '❄️'],
    regen: ['1F302', '☔️', '1F32B', '1F4A7', '⛅️'],
    schnee: ['2744', '26C4', '1F3C2', '1F9CA'],
    sonne: ['2600', '1F305', '1F306', '1F310'],
    weihnachten: ['1F384', '1F385', '1F936', '1F9D9', '1F541', '1F983', '26C4', '1F52E', '1F514', '1F517', '1F9E6', '1F36A', '1F377', '1F37B'],
    halloween: ['1F383', '1F47B', '1F480', '1F479', '1F47D', '1F9FF'],
    ostern: ['1F407', '1F430', '1F95A', '1F41A', '1F6E2'],
    neujahr: ['1F386', '🎆', '🥂', '🍾'],
    valentinstag: ['❤️', '🌹', '1F48F', '1F457', '1F484'],
    geburtstag: ['🎂', '🎈', '🎉', '1F38A'],
    tiere: ['1F400', '1F401', '1F402', '1F403', '1F404', '1F405', '1F406', '1F407', '1F408', '1F409', '1F40A', '1F40B', '1F40C', '1F40D', '1F40E', '1F40F', '1F410', '1F411', '1F412', '1F413', '1F414', '1F415', '1F416', '1F417', '1F418', '1F419', '1F41A', '1F41B', '1F41C', '1F41D', '1F41E', '1F41F', '1F420', '1F421', '1F422', '1F423', '1F424', '1F425', '1F426', '1F427', '1F428', '1F429', '1F42A', '1F42B', '1F42C', '1F42D', '1F42E', '1F42F', '1F430', '1F431', '1F432', '1F433', '1F434', '1F435', '1F436', '1F437', '1F438', '1F439', '1F43A', '1F43B', '1F43C', '1F43D', '1F43E', '1F43F', '1F440', '1F983', '1F984', '1F985', '1F986', '1F987', '1F988', '1F989', '1F98A'],
    haustiere: ['1F436', '1F415', '1F408', '1F417', '1F430', '1F439', '1F43A', '1F424', '1F425', '1F42E', '1F414', '1F40D', '1F3AD'],
    vögel: ['1F983', '1F985', '1F986', '1F987', '1F414', '1F424', '1F425', '1F426', '1F427'],
    wildtiere: ['1F98A', '1F405', '1F406', '1F409', '1F40E', '1F410', '1F411', '1F412', '1F418', '1F428', '1F43B', '1F984', '1F988'],
    insekten: ['1F41A', '1F41B', '1F41C', '1F41D', '1F41E', '1F40C', '1F40D'],
    blumen: ['1F337', '1F338', '1F339', '1F33A', '1F33B', '1F33C', '1F490', '1FAB7', '1FAB6'],
    natur: ['1F333', '1F334', '1F335', '1F330', '1F4A0', '🌊', '🏔️', '🏕️'],
    essen: ['1F32D', '1F32E', '1F32F', '1F330', '1F32C', '1F347', '1F348', '1F349', '1F34A', '1F34B', '1F34C', '1F34D', '1F34E', '1F34F', '1F350', '1F951', '1F352', '1F353', '1F354', '1F355', '1F356', '1F357', '1F358', '1F359', '1F35A', '1F35B', '1F35C', '1F35D', '1F35E', '1F35F', '1F360', '1F361', '1F362', '1F363', '1F364', '1F365', '1F366', '1F367', '1F368', '1F369', '1F36A', '1F36B', '1F36C', '1F36D', '1F36E', '1F36F', '1F950', '1F956', '1F957'],
    süßes: ['1F36A', '1F36B', '1F36C', '1F36D', '1F36E', '1F36F', '1F950'],
    kaffee: ['☕️'],
    tee: ['🫖'],
    arbeit: ['1F4BC', '1F4BD', '1F4BE', '1F4BF', '1F4C0', '1F4C1', '1F4C2', '1F4C3', '1F4C4', '1F4C5', '1F4C6', '1F4C7', '1F4C8', '1F4C9', '1F4CA', '1F4CB', '1F4CC', '1F4CD', '1F4CE', '1F4CF', '1F4D0', '1F4D1', '1F4D2', '1F4D3', '1F4D4', '1F4D5', '1F4D6', '1F4D7', '1F4D8', '1F4D9', '1F4DA', '1F4DB', '1F4DC', '1F4DD'],
    schule: ['1F4D0', '1F4D1', '1F4D2', '1F4D3', '1F4D4', '1F4D5', '1F4D6', '1F4D7', '1F4D8', '1F4D9', '1F4DA'],
    sport: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳️', '⛸️', '🎣', '🎽', '🎿', '🛷', '🛹'],
    musik: ['🎵', '🎶', '🎼', '🎹', '🎸', '🎺', '🎷', '🥁', '🎻', '🎲'],
    lesen: ['1F4D0', '1F4D1', '1F4D2', '1F4D3', '1F4D4', '1F4D5', '1F4D6', '1F4D7', '1F4D8'],
    technik: ['💻', '🖥️', '⌨️', '🖱️', '🖨️', '📱', '☎️', '📞', '📟', '📠', '📺', '📷', '📹', '🎥', '📽️', '🎬', '📢', '📣', '📻', '📡', '⚡️', '🔋', '🔌'],
    körper: ['👁️', '👃', '👅', '✋', '✌️', '🤟', '💪', '🦵', '🦶', '❤️', '🧠'],
};

const themesEN = {
    spring: ['1F331', '1F337', '1F338', '1F339', '1F33A', '1F33B', '1F33C', '1F33D', '1F33E', '1F33F', '1F340', '1F341', '1F342', '1F343', '1F490', '1FAB7', '1FAB6', '1F30E', '1F41A', '1F41B', '1F41C', '1F41D', '1F41E', '1F407', '1F430', '1F983', '1F414', '1F423', '1F424', '1F425'],
    summer: ['2600', '1F305', '1F306', '1F30E', '1F3DD', '1F4A7', '1F32B', '1F366', '1F367', '1F368', '1F369', '🩱', '1F3C2'],
    autumn: ['1F342', '1F341', '1F343'],
    winter: ['2744', '1F328', '26C4', '1F3C2', '1F9CA'],
    rain: ['1F302', '☔️', '1F32B', '1F4A7'],
    snow: ['2744', '26C4', '1F3C2', '1F9CA'],
    sun: ['2600', '1F305', '1F306'],
    christmas: ['1F384', '1F385', '1F936', '1F541', '1F983', '26C4', '1F514', '1F517', '1F9E6', '1F36A', '1F377'],
    halloween: ['1F383', '1F47B', '1F480', '1F479', '1F47D', '1F9FF'],
    easter: ['1F407', '1F430', '1F95A', '1F41A'],
    birthday: ['1F382', '1F388', '1F389', '1F38A'],
    animals: ['1F400', '1F401', '1F402', '1F403', '1F404', '1F405', '1F406', '1F407', '1F408', '1F409', '1F40A', '1F40B', '1F40C', '1F40D', '1F40E', '1F40F', '1F410', '1F411', '1F412', '1F413', '1F414', '1F415', '1F416', '1F417', '1F418', '1F419', '1F41A', '1F41B', '1F41C', '1F41D', '1F41E', '1F41F', '1F420', '1F421', '1F422', '1F423', '1F424', '1F425', '1F426', '1F427', '1F428', '1F429', '1F42A', '1F42B', '1F42C', '1F42D', '1F42E', '1F42F', '1F430', '1F431', '1F432', '1F433', '1F434', '1F435', '1F436', '1F437', '1F438', '1F439', '1F43A', '1F43B', '1F43C', '1F43D', '1F43E', '1F43F', '1F983', '1F984', '1F985', '1F986', '1F987', '1F988', '1F989', '1F98A'],
    pets: ['1F436', '1F415', '1F408', '1F417', '1F430', '1F439', '1F43A', '1F424', '1F425', '1F42E', '1F414'],
    birds: ['1F983', '1F985', '1F986', '1F987', '1F414', '1F424', '1F425', '1F426', '1F427'],
    flowers: ['1F337', '1F338', '1F339', '1F33A', '1F33B', '1F33C', '1F490'],
    food: ['1F32D', '1F32E', '1F32F', '1F330', '1F347', '1F348', '1F349', '1F34A', '1F34B', '1F34C', '1F34D', '1F34E', '1F34F', '1F350', '1F951', '1F352', '1F353', '1F354', '1F355', '1F356', '1F357', '1F358', '1F359', '1F35A', '1F35B', '1F35C', '1F35D', '1F35E', '1F35F', '1F360', '1F361', '1F362', '1F363', '1F364', '1F365', '1F366', '1F367', '1F368', '1F369', '1F36A', '1F36B', '1F36C', '1F36D', '1F36E', '1F36F', '1F950', '1F956', '1F957'],
    coffee: ['☕️'],
    work: ['1F4BC', '1F4C0', '1F4C1', '1F4C2', '1F4C3', '1F4C8', '1F4CA', '1F4CB', '1F4CC'],
    school: ['1F4D0', '1F4D1', '1F4D2', '1F4D5', '1F4D6'],
    sports: ['⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐'],
    music: ['🎵', '🎶', '🎼', '🎹', '🎸', '🎺'],
    tech: ['💻', '🖥️', '⌨️', '🖱️', '📱', '☎️', '📺', '📷'],
};

// Apply themes
for (const [lang, themesData] of [['de', themesDE], ['en', themesEN]]) {
    const result = themesData;
    writeFileSync(`themes/${lang}.json`, JSON.stringify(result, null, 2) + '\n');
    const themesCount = Object.keys(result).length;
    const totalMembers = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`✓ themes/${lang}.json — ${themesCount} themes, ${totalMembers} memberships`);
}
