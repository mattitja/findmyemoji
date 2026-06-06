#!/usr/bin/env node
// Phase 3: Generate and apply synonyms (Tier 2) to keywords/{de,en}.json
// Category-wise approach based on examples from the plan.
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));

// Synonym mappings: emoji label/keyword patterns → array of synonyms
// Format: { pattern: 'pattern to match', synonyms: ['syn1', 'syn2'] }
const synonymsDE = [
    // Kosenamen / Verniedlichungen
    { pattern: /katze|katz/i, synonyms: ['mieze', 'miezekatze', 'stubentiger'] },
    { pattern: /^hund|hunde/i, synonyms: ['hundi', 'wauwau', 'fellnase', 'dackel'] },
    { pattern: /herz$/i, synonyms: ['herzchen', 'herzi'] },
    { pattern: /hase|kaninchen/i, synonyms: ['häschen', 'hasi', 'häsle', 'möhre'] },
    { pattern: /schaf/i, synonyms: ['lamm', 'wollkopf'] },
    { pattern: /ente/i, synonyms: ['erpel', 'watschler'] },
    { pattern: /papagei|sittich/i, synonyms: ['lora', 'ara'] },

    // Umgangssprache / Vulgärsprache
    { pattern: /übergeben|brechen|erbrechen|kotzend|kotzen/i, synonyms: ['kotzen', 'speien', 'auskotzen'] },
    { pattern: /kacke|haufen|fäzes|fäkalien|poop|poo|scheiße|scheisshaus|klosett/i, synonyms: ['scheiße', 'kacke', 'kacken', 'popo'] },
    { pattern: /pfirsich|po |hintern|arsch|butt|gluteus|gesäß|sitzfläche/i, synonyms: ['po', 'arsch', 'hintern', 'popo', 'steißbein'] },
    { pattern: /aubergine|eggplant/i, synonyms: ['schwanz', 'glied'] },
    { pattern: /klo|toilette|abort|abort|klosett|scheißhaus|kackhaufen/i, synonyms: ['klo', 'klospülung', 'scheißhaus', 'lokus'] },
    { pattern: /kuss|küsse|küsschen|busen/i, synonyms: ['knutschen', 'küsschen', 'schmatz', 'bussi'] },

    // Regionale Varianten (Brot/Brötchen)
    { pattern: /baguette|französisch.*brot|weißbrot/i, synonyms: ['brötchen', 'semmel', 'schrippe', 'weckle', 'wecken', 'rundstück'] },
    { pattern: /croissant/i, synonyms: ['hörnchen', 'kipferl', 'gipfeli'] },
    { pattern: /hot dog|wurst|wiener|frankfurter|brühwurst/i, synonyms: ['wurst', 'würstchen', 'wienerle', 'frankfurter', 'leberwurst'] },
    { pattern: /brezel|bretzel|laugenbrezel/i, synonyms: ['brezel', 'breze', 'brezn', 'laugenbrezn'] },
    { pattern: /bier|pilsener|helles|weizen|dunkel/i, synonyms: ['bier', 'halbe', 'maß', 'kaltes', 'pils', 'hellen'] },

    // Redewendungen / Gesten-Bedeutungen
    { pattern: /daumen.*hoch|hand.*zwei.*finger|victory/i, synonyms: ['daumen drücken', 'viel glück', 'sieg'] },
    { pattern: /person.*kopf.*hand|frustriert|verzweifelt|ungläubig/i, synonyms: ['kopf gegen wand', 'facepalm', 'verzweifeln', 'ungläubigkeit'] },
    { pattern: /gefaltete.*hände|betende.*hände|respekt|dank/i, synonyms: ['danke', 'bitte', 'beten', 'respekt', 'namaste'] },
    { pattern: /daumen.*nach oben|signale|ok|zustimmung/i, synonyms: ['fettes lob', 'passt', 'okay', 'gut so', 'thumbs up'] },
    { pattern: /hände.*herz|hand.*liebe|liebevoll/i, synonyms: ['love', 'ich liebe es', 'miniherz'] },
    { pattern: /handschlag|vereinbarung|geschäft|deal/i, synonyms: ['deal', 'abgemacht', 'geschäft', 'einigung'] },
    { pattern: /gehirn|verstand|kopf|denken/i, synonyms: ['denken', 'nachdenken', 'grübeln', 'überlegung'] },

    // Slang / Jugendsprache
    { pattern: /lachend|tot.*lachen|zu.*tod.*lachen|schreien.*lachen/i, synonyms: ['ich bin tot', 'lol', 'umgefallen', 'zu tode lachen'] },
    { pattern: /feuer/i, synonyms: ['feuer', 'krass', 'fett', 'geil', 'stark', 'hot'] },
    { pattern: /funkeln|glimmer|schimmer|glanz/i, synonyms: ['fancy', 'extra', 'sparkle', 'blingbling'] },
    { pattern: /sehr.*lachen|lautes.*lachen|tränen.*lachen/i, synonyms: ['lol', 'lmao', 'rofl', 'lachen'] },
    { pattern: /lächeln.*tränen|tränen.*lächeln|verkneifen/i, synonyms: ['tränen lachen', 'verkneifen', 'unterdrücken'] },
    { pattern: /geschmolzen|schmelz|warm|hitze/i, synonyms: ['geschmolzen', 'ich kann nicht mehr', 'verflüssigt'] },

    // Funktional / Anwendung
    { pattern: /zwischenablage|kopieren|clipboard|klemmbrett/i, synonyms: ['kopieren', 'einfügen', 'zwischenablage', 'clipboard'] },
    { pattern: /achtung|vorsicht|warnung|warnsignal|gefahren/i, synonyms: ['achtung', 'vorsicht', 'warnung', 'gefahr'] },
    { pattern: /falsch|nein|abgelehnt|nicht ok|kreutz/i, synonyms: ['falsch', 'nein', 'abgelehnt', 'nicht ok'] },
    { pattern: /richtig|ja|erledigt|bestätigung|häkchen|ok|prüf/i, synonyms: ['richtig', 'ja', 'erledigt', 'passt', 'ok'] },
];

const synonymsEN = [
    // Affectionate / pet names
    { pattern: /^cat/i, synonyms: ['kitty', 'kitten', 'pussycat', 'tom'] },
    { pattern: /^dog/i, synonyms: ['doggie', 'doggo', 'puppy', 'pup', 'pooch'] },
    { pattern: /heart$/i, synonyms: ['heart', 'sweetheart', 'luv'] },
    { pattern: /^rabbit|bunny/i, synonyms: ['bunny', 'bun', 'hare'] },
    { pattern: /sheep/i, synonyms: ['lamb', 'woolly'] },
    { pattern: /duck/i, synonyms: ['ducky', 'drake'] },
    { pattern: /parrot|parakeet|macaw/i, synonyms: ['polly', 'squawk'] },

    // Slang / vulgar / euphemisms
    { pattern: /vomiting|face.*vomit|nauseated|sick|puke|barf/i, synonyms: ['puke', 'barf', 'throwing up', 'vomit'] },
    { pattern: /pile.*poo|poop|feces|defecation|shit|crap/i, synonyms: ['poop', 'shit', 'crap', 'number two'] },
    { pattern: /face.*kiss|kiss.*mark|mouth|smooching/i, synonyms: ['kiss', 'smooch', 'mwah', 'smack'] },
    { pattern: /peach|butt|bottom|ass|booty|rump/i, synonyms: ['butt', 'ass', 'booty', 'cheeks'] },
    { pattern: /eggplant|aubergine/i, synonyms: ['dick', 'eggplant', 'purple vegetable'] },
    { pattern: /toilet|wc|restroom|bathroom|loo|john|privy/i, synonyms: ['toilet', 'wc', 'loo', 'john', 'potty'] },

    // Regional / dialect
    { pattern: /soccer ball|ball.*football/i, synonyms: ['football', 'footy', 'soccer ball', 'ball'] },
    { pattern: /french fries|fried|potatoes|chips/i, synonyms: ['fries', 'chips', 'french fries', 'spuds'] },
    { pattern: /cookie|biscuit/i, synonyms: ['cookie', 'biscuit', 'wafer'] },
    { pattern: /automobile|car|vehicle/i, synonyms: ['car', 'automobile', 'auto', 'vehicle'] },

    // Idioms / gesture meanings
    { pattern: /fingers crossed|good luck|luck/i, synonyms: ['fingers crossed', 'good luck', 'luck'] },
    { pattern: /person facepalm|person gesturing|exhausted/i, synonyms: ['facepalm', 'give up', 'i cant'] },
    { pattern: /folded hands|prayer|begging/i, synonyms: ['thanks', 'please', 'praying', 'respect'] },
    { pattern: /thumbs up|ok|good|approval|like/i, synonyms: ['thumbs up', 'ok', 'approve', 'like', 'good'] },
    { pattern: /hand.*heart|love/i, synonyms: ['heart hands', 'love this', 'i love it'] },

    // Slang / Gen-Z / internet
    { pattern: /skull|skeletons|rip|dying/i, synonyms: ['im dead', 'lol', 'rip', 'dying'] },
    { pattern: /fire|burning|lit|dope|sick|amazing/i, synonyms: ['fire', 'lit', 'sick', 'dope'] },
    { pattern: /sparkles|glitter|glittery|shiny/i, synonyms: ['fancy', 'extra', 'sparkle', 'glitter'] },
    { pattern: /rolling.*floor.*laugh|tears of joy|joy|happiness/i, synonyms: ['lol', 'lmao', 'rofl', 'crying laughing'] },
    { pattern: /smiling.*tear|tear|emotion/i, synonyms: ['smiling tear', 'holding back tears', 'sad smile'] },
    { pattern: /melting|hot|warm|floppy|droopy/i, synonyms: ['melting', 'i cant even', 'overheated'] },
    { pattern: /cap|lying|liar|lie|no cap/i, synonyms: ['cap', 'lie', 'no cap', 'liar'] },

    // Functional / utility
    { pattern: /clipboard|copy|paste|document/i, synonyms: ['copy', 'paste', 'clipboard', 'document'] },
    { pattern: /warning|caution|alert|danger/i, synonyms: ['warning', 'caution', 'alert', 'danger'] },
    { pattern: /cross.*mark|no|wrong|denied/i, synonyms: ['no', 'wrong', 'denied', 'cross'] },
    { pattern: /check.*mark|yes|right|done|approved|ok/i, synonyms: ['yes', 'right', 'done', 'check', 'approved'] },
];

function generateSynonyms(emoji, label, keywords, lang) {
    const synonymList = lang === 'de' ? synonymsDE : synonymsEN;
    const allCandidates = new Set();

    for (const { pattern, synonyms } of synonymList) {
        // Test against emoji label
        if (pattern.test(label)) {
            synonyms.forEach(s => allCandidates.add(s));
        }
        // Test against keywords
        for (const kw of keywords) {
            if (pattern.test(kw)) {
                synonyms.forEach(s => allCandidates.add(s));
            }
        }
    }

    // Limit to 8 synonyms per emoji
    return Array.from(allCandidates).slice(0, 8);
}

// Apply synonyms
for (const [lang, kw] of [['de', kwDe], ['en', kwEn]]) {
    const data = lang === 'de' ? deData : enData;
    const dataMap = new Map(data.map(e => [e.hexcode, e]));

    let totalAdded = 0;
    let totalModified = 0;

    for (const [hexcode, entry] of Object.entries(kw)) {
        const emoji = dataMap.get(hexcode);
        if (!emoji) continue;

        const newSyns = generateSynonyms(emoji, emoji.label, entry.name, lang);

        if (newSyns.length > 0) {
            entry.synonyms = newSyns;
            totalAdded += newSyns.length;
            totalModified++;
        }
    }

    writeFileSync(`keywords/${lang}.json`, JSON.stringify(kw, null, 2) + '\n');
    console.log(`✓ keywords/${lang}.json — ${totalAdded} synonyms, ${totalModified} emojis modified`);
}
