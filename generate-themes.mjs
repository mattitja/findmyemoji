#!/usr/bin/env node
// Phase 2: Generate theme memberships by analyzing emoji labels and keywords.
// Outputs themes/{de,en}.json with structure { theme: [hexcode...] }
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const deData = require('emojibase-data/de/data.json');
const enData = require('emojibase-data/en/data.json');

const enMap = new Map(enData.map(e => [e.hexcode, e]));
const kwEn = JSON.parse(readFileSync('keywords/en.json', 'utf-8'));
const kwDe = JSON.parse(readFileSync('keywords/de.json', 'utf-8'));

mkdirSync('themes', { recursive: true });

// Theme definitions with keywords to match against emoji labels/keywords
const themesDef = {
    de: {
        frühling: ['pflanze', 'blume', 'blüte', 'blatt', 'ei', 'ente', 'biene', 'schmetterling', 'frühling', 'lenz', 'schneeglöckchen', 'krokus', 'kirschblüte', 'sakura'],
        sommer: ['sonne', 'sonnig', 'strand', 'eis', 'eiscreme', 'eis am stiel', 'sommer', 'hitze', 'schwimmen', 'wasser', 'welle', 'freibad'],
        herbst: ['blatt', 'herbst', 'fall', 'oktober', 'november', 'oktober', 'thanksgiving'],
        winter: ['schnee', 'schneeflocke', 'schneemann', 'winter', 'dezember', 'januar', 'februar', 'frost', 'eiskristall', 'eiszapfen'],
        regen: ['regen', 'wolke', 'tropfen', 'nebel', 'schauer'],
        schnee: ['schnee', 'schneeflocke', 'schneemann', 'eiskristall'],
        sonne: ['sonne', 'sonnig', 'strahlen', 'sonnenaufgang', 'sonnenuntergang'],
        wolken: ['wolke', 'nebel', 'dunst'],
        sturm: ['sturm', 'gewitter', 'blitz', 'donner'],
        wind: ['wind', 'windstoß', 'tornado'],
        morgen: ['morgen', 'sonnenaufgang', 'aufwachen', 'frühstück'],
        nacht: ['nacht', 'mond', 'sterne', 'stern', 'mitternacht', 'dunkelheit'],
        weihnachten: ['weihnacht', 'weihnachtsbaum', 'weihnachtsmann', 'nikolaus', 'nikoläus', 'rentier', 'schneemann', 'schneeflocke', 'glocke', 'gift', 'geschenk', 'strumpf', 'keks', 'plätzchen', 'kerze', 'schleife', 'feuer'],
        halloween: ['halloween', 'kürbis', 'geist', 'gespenst', 'skelett', 'schädel', 'hexe', 'dracula', 'vampire', 'zombie', 'mummy', 'mumie', 'kobold', 'imp', 'dämon'],
        ostern: ['ostern', 'osterhase', 'hase', 'kaninchen', 'ei', 'nest'],
        neujahr: ['neujahr', 'silvester', 'feuerwerk', 'sekt', 'champagner', 'uhr'],
        valentinstag: ['valentine', 'liebe', 'herz', 'rote rose', 'geschenk', 'kuss', 'liebesbrief'],
        geburtstag: ['geburtstag', 'kuchen', 'kerzen', 'luftballons', 'luftballon', 'confetti', 'geschenk', 'feier'],
        hochzeit: ['hochzeit', 'ehering', 'ring', 'brautpaar', 'braut', 'bräutigam', 'trauung'],
        tiere: ['tier', 'säugetier', 'vogel', 'fisch', 'reptilie', 'insekt', 'spinne', 'arachnid', 'fabelwesen', 'mythisch'],
        haustiere: ['hund', 'katze', 'kaninchen', 'hamster', 'meerschweinchen', 'vogel', 'papagei', 'sittich', 'kanarie', 'fisch', 'goldfisch'],
        vögel: ['vogel', 'feder', 'adler', 'falke', 'rabe', 'krähe', 'taube', 'ente', 'gans', 'schwan', 'uhu', 'eule', 'fasan', 'huhn', 'henne', 'hahn'],
        wildtiere: ['löwe', 'tiger', 'leopard', 'panther', 'bär', 'wolf', 'fuchs', 'waschbär', 'hirsch', 'reh', 'hirsch', 'antilope', 'gnu', 'zebra', 'giraffe'],
        insekten: ['biene', 'wespe', 'hornisse', 'schmetterling', 'raupe', 'käfer', 'marienkäfer', 'schnecke', 'spinne', 'skorpion', 'libelle', 'heupferd', 'heuschrecke'],
        natur: ['baum', 'wald', 'wiese', 'feld', 'berge', 'berg', 'landschaft', 'erde', 'natur', 'pflanze', 'kraut', 'gras'],
        garten: ['garten', 'blume', 'rose', 'tulpe', 'topfpflanze', 'baum', 'pflanze', 'kaktus', 'blüte'],
        blumen: ['blume', 'blüte', 'rose', 'tulpe', 'sonnenblume', 'gänseblümchen', 'chrysantheme', 'nelke', 'lilie', 'iris', 'orchidee', 'magnolia', 'kirschblüte'],
        wald: ['wald', 'baum', 'kiefer', 'fichte', 'tanne', 'eiche', 'buche', 'birke', 'laub'],
        essen: ['essen', 'speise', 'gericht', 'lebensmittel'],
        süßes: ['süß', 'zucker', 'bonbon', 'lolly', 'lollipop', 'karamell', 'bonbons', 'pralinen'],
        kaffee: ['kaffee', 'latte', 'cappuccino', 'espresso'],
        tee: ['tee', 'tasse'],
        glücklich: ['lachen', 'lächeln', 'glück', 'fröhlich', 'freudig', 'vergnügt', 'smiley'],
        traurig: ['trauer', 'traurig', 'unglücklich', 'niedergeschlagen', 'melancholie', 'weinen'],
        liebe: ['liebe', 'verliebt', 'herz', 'zuneigung', 'romantik', 'romance', 'vernarrt'],
        arbeit: ['arbeit', 'beruf', 'beruflich', 'geschäft', 'büro', 'computer', 'schreibtisch', 'aktenordner', 'chart', 'diagramm', 'tabelle'],
        schule: ['schule', 'schulunterricht', 'unterricht', 'klasse', 'lehrer', 'student', 'schüler', 'buch', 'bleistift', 'stift', 'lineal', 'zirkel', 'geodreieck', 'tafel'],
        sport: ['sport', 'spiel', 'fußball', 'fussball', 'basketball', 'tennisball', 'volleyball', 'skifahrer', 'läufer', 'schwimmer', 'yoga', 'fitness', 'sport'],
        musik: ['musik', 'noten', 'note', 'musiker', 'instrument', 'lied', 'oper', 'symphonie', 'melodie', 'sänger'],
        lesen: ['lesen', 'buch', 'bücher', 'roman', 'geschichte', 'märchen', 'bibliothek'],
        technik: ['computer', 'laptop', 'monitor', 'tastatur', 'maus', 'drucker', 'handy', 'smartphone', 'telefon', 'kamera', 'fotografie', 'fernseher', 'radio', 'elektronik'],
        körper: ['körper', 'kopf', 'auge', 'nase', 'mund', 'ohr', 'zahn', 'zunge', 'hand', 'finger', 'fuß', 'fuß', 'herz', 'lunge', 'gehirn', 'skelett', 'knochen'],
        rot: ['rot', 'rote', 'roter', 'rotes', 'kirsche', 'erdbeere', 'tomate', 'rose', 'herz', 'lüster', 'apfel', 'granatapfel'],
        gelb: ['gelb', 'gelbe', 'gelber', 'gelbes', 'sonne', 'sonnenblume', 'zitrone', 'banane', 'stern', 'gold', 'golden'],
        grün: ['grün', 'grüne', 'grüner', 'grünes', 'baum', 'gras', 'blatt', 'limette', 'salat', 'broccoli', 'brokkoli', 'paprika'],
        blau: ['blau', 'blaue', 'blauer', 'blaues', 'himmel', 'wasser', 'meer', 'ozean', 'see', 'blaubeere', 'heidelbeere', 'jeans'],
        rosa: ['rosa', 'pink', 'pinke', 'pinker', 'pinkes', 'schwein', 'flamingo', 'kirschblüte', 'pfirsich', 'kirsche'],
        schwarz: ['schwarz', 'schwarze', 'schwarzer', 'schwarzes', 'katze', 'rabe', 'krähe', 'nacht', 'kohle'],
        weiß: ['weiß', 'weiße', 'weißer', 'weißes', 'schnee', 'schneemann', 'wolke', 'milch', 'käse', 'ei', 'lilie', 'gänseblümchen'],
        cringe: ['cringe', 'peinlich', 'unbehaglich'],
        mood: ['mood', 'vibe', 'stimmung', 'feeling'],
        flex: ['flex', 'prahlerei', 'stolz', 'muskeln'],
        slay: ['slay', 'fantastisch', 'großartig'],
    },
    en: {
        spring: ['flower', 'plant', 'bud', 'egg', 'duckling', 'bee', 'butterfly', 'spring', 'bloom', 'blossom', 'cherry', 'sakura'],
        summer: ['sun', 'sunny', 'beach', 'ice', 'ice cream', 'summer', 'heat', 'swimming', 'water', 'wave', 'palm'],
        autumn: ['leaf', 'autumn', 'fall', 'october', 'november'],
        winter: ['snow', 'snowflake', 'snowman', 'winter', 'december', 'january', 'february', 'frost', 'ice'],
        rain: ['rain', 'cloud', 'drop', 'fog'],
        snow: ['snow', 'snowflake', 'snowman', 'crystal'],
        sun: ['sun', 'sunny', 'sunrise', 'sunset', 'ray'],
        clouds: ['cloud', 'fog', 'mist'],
        storm: ['storm', 'thunderstorm', 'lightning', 'thunder'],
        wind: ['wind', 'gust', 'tornado'],
        morning: ['morning', 'sunrise', 'wake', 'breakfast'],
        night: ['night', 'moon', 'star', 'midnight', 'dark'],
        christmas: ['christmas', 'tree', 'santa', 'claus', 'reindeer', 'snowman', 'snowflake', 'bell', 'gift', 'present', 'stocking', 'cookie', 'candy', 'candle', 'bow', 'ribbon'],
        halloween: ['halloween', 'pumpkin', 'ghost', 'ghost', 'skeleton', 'skull', 'witch', 'dracula', 'vampire', 'zombie', 'mummy', 'imp', 'demon', 'devilish'],
        easter: ['easter', 'bunny', 'rabbit', 'egg', 'nest', 'chick'],
        'new year': ['new year', 'new year\'s', 'countdown', 'firework', 'champagne', 'clock'],
        'valentines day': ['valentine', 'love', 'heart', 'rose', 'gift', 'kiss', 'cupid'],
        birthday: ['birthday', 'cake', 'candles', 'balloon', 'confetti', 'gift', 'party'],
        wedding: ['wedding', 'ring', 'bride', 'groom', 'married', 'marriage', 'veil'],
        animals: ['animal', 'mammal', 'bird', 'fish', 'reptile', 'insect', 'spider', 'creature', 'beast', 'mythical'],
        pets: ['dog', 'cat', 'rabbit', 'hamster', 'guinea pig', 'bird', 'parrot', 'canary', 'fish', 'goldfish'],
        birds: ['bird', 'feather', 'eagle', 'hawk', 'raven', 'crow', 'dove', 'duck', 'goose', 'swan', 'owl', 'pheasant', 'chicken', 'hen', 'rooster'],
        wildlife: ['lion', 'tiger', 'leopard', 'bear', 'wolf', 'fox', 'raccoon', 'deer', 'doe', 'antelope', 'gnu', 'zebra', 'giraffe', 'panda', 'koala'],
        insects: ['bee', 'wasp', 'hornet', 'butterfly', 'caterpillar', 'beetle', 'ladybug', 'snail', 'spider', 'scorpion', 'dragonfly', 'cricket', 'grasshopper'],
        nature: ['tree', 'forest', 'meadow', 'field', 'mountain', 'landscape', 'earth', 'plant', 'herb', 'grass'],
        garden: ['garden', 'flower', 'rose', 'tulip', 'potted plant', 'tree', 'plant', 'cactus', 'bloom'],
        flowers: ['flower', 'blossom', 'rose', 'tulip', 'sunflower', 'daisy', 'chrysanthemum', 'carnation', 'lily', 'iris', 'orchid', 'magnolia', 'cherry blossom'],
        forest: ['forest', 'tree', 'pine', 'spruce', 'fir', 'oak', 'beech', 'birch', 'leaf'],
        food: ['food', 'meal', 'dish', 'cuisine'],
        sweets: ['sweet', 'candy', 'lolly', 'lollipop', 'caramel', 'bonbon'],
        coffee: ['coffee', 'latte', 'cappuccino', 'espresso'],
        tea: ['tea', 'cup'],
        happy: ['laugh', 'smile', 'happiness', 'happy', 'joy', 'glad', 'cheerful', 'joyful', 'smiley', 'grin'],
        sad: ['sadness', 'sad', 'unhappy', 'melancholy', 'cry', 'weep'],
        love: ['love', 'affection', 'heart', 'romance', 'romantic', 'devoted', 'adore'],
        work: ['work', 'job', 'profession', 'business', 'office', 'computer', 'desk', 'briefcase', 'chart', 'diagram', 'table', 'graph', 'email'],
        school: ['school', 'class', 'teaching', 'teacher', 'student', 'pupil', 'book', 'pencil', 'pen', 'ruler', 'compass', 'protractor', 'blackboard'],
        sports: ['sport', 'game', 'soccer', 'football', 'basketball', 'tennis ball', 'volleyball', 'skier', 'runner', 'swimmer', 'yoga', 'fitness'],
        music: ['music', 'notes', 'note', 'musician', 'instrument', 'song', 'opera', 'symphony', 'melody', 'singer'],
        reading: ['read', 'book', 'novel', 'story', 'tale', 'fairy tale', 'library'],
        tech: ['computer', 'laptop', 'monitor', 'keyboard', 'mouse', 'printer', 'phone', 'smartphone', 'telephone', 'camera', 'photography', 'television', 'radio', 'electronic'],
        body: ['body', 'head', 'eye', 'nose', 'mouth', 'ear', 'tooth', 'tongue', 'hand', 'finger', 'foot', 'heart', 'lung', 'brain', 'skeleton', 'bone'],
        red: ['red', 'cherry', 'strawberry', 'tomato', 'rose', 'apple', 'pomegranate', 'watermelon', 'pepper'],
        yellow: ['yellow', 'sun', 'sunflower', 'lemon', 'banana', 'star', 'gold', 'golden', 'corn'],
        green: ['green', 'tree', 'grass', 'leaf', 'lime', 'salad', 'broccoli', 'bell pepper', 'cactus'],
        blue: ['blue', 'sky', 'water', 'sea', 'ocean', 'lake', 'blueberry', 'jeans'],
        pink: ['pink', 'pig', 'flamingo', 'cherry blossom', 'peach', 'strawberry'],
        black: ['black', 'cat', 'raven', 'crow', 'night', 'coal'],
        white: ['white', 'snow', 'snowman', 'cloud', 'milk', 'cheese', 'egg', 'lily', 'daisy'],
        cringe: ['cringe', 'embarrassing', 'awkward'],
        mood: ['mood', 'vibe', 'feeling', 'atmosphere'],
        flex: ['flex', 'boasting', 'proud', 'muscle'],
        slay: ['slay', 'fantastic', 'great', 'amazing'],
    }
};

function matchesKeywords(emojiLabel, emojiKeywords, themeKeywords) {
    const lowerLabel = emojiLabel.toLowerCase();
    const keywordsSet = new Set([...emojiKeywords.map(k => k.toLowerCase())]);

    for (const themeKw of themeKeywords) {
        if (lowerLabel.includes(themeKw) || keywordsSet.has(themeKw)) {
            return true;
        }
    }
    return false;
}

// Generate themes for each language
for (const [lang, themes] of Object.entries(themesDef)) {
    const emojisData = lang === 'de' ? deData : enData;
    const kwMap = lang === 'de' ? kwDe : kwEn;
    const result = {};

    for (const [themeName, themeKeywords] of Object.entries(themes)) {
        const members = [];

        for (const emoji of emojisData) {
            if (!emoji.label || !emoji.hexcode) continue;

            const kwEntry = kwMap[emoji.hexcode] || { name: [] };
            const allKeywords = [...kwEntry.name];

            if (matchesKeywords(emoji.label, allKeywords, themeKeywords)) {
                members.push(emoji.hexcode);
            }
        }

        if (members.length > 0) {
            result[themeName] = members;
        }
    }

    writeFileSync(`themes/${lang}.json`, JSON.stringify(result, null, 2) + '\n');
    const themesCount = Object.keys(result).length;
    const totalMembers = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`✓ themes/${lang}.json — ${themesCount} themes, ${totalMembers} memberships`);
}
