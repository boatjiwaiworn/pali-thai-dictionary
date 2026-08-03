import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DICTS_DIR = path.join(__dirname, 'data', 'dicts');

const THAI_DICTS = [
  { file: 'th-etipitaka.db', short: 'ET' },
  { file: 'th-aj-subhira.db', short: 'SU' },
  { file: 'th-thaiware.db', short: 'TW' },
  { file: 'th-dhamma-cheti-1.db', short: 'DC1' },
  { file: 'th-dhamma-cheti-2.db', short: 'DC2' },
  { file: 'th-bhumibol.db', short: 'BB' },
  { file: 'th-dmc.db', short: 'DMC' },
  { file: 'th-newgen.db', short: 'NG' },
];

// Thai → Sinhala converter
const thaiToSinh = new Map([
  ['ก','ක'],['ข','ඛ'],['ค','ග'],['ฆ','ඝ'],['ง','ඞ'],
  ['จ','ච'],['ฉ','ඡ'],['ช','ජ'],['ฌ','ඣ'],['ญ','ඤ'],
  ['ฏ','ට'],['ฐ','ඨ'],['ฑ','ඩ'],['ฒ','ඪ'],['ณ','ණ'],
  ['ต','ත'],['ถ','ථ'],['ท','ද'],['ธ','ධ'],['น','න'],
  ['ป','ප'],['ผ','ඵ'],['พ','බ'],['ภ','භ'],['ม','ම'],
  ['ย','ය'],['ร','ර'],['ล','ල'],['ฬ','ළ'],
  ['ว','ව'],['ส','ස'],['ห','හ'],
  ['อ','අ'],
  ['า','ා'],['\u0E34','ි'],['\u0E35','ී'],['\u0E38','ු'],['\u0E39','ූ'],
  ['เ','ෙ'],['โ','ො'],
  ['\u0E4D','ං'],['ะ','ඃ'],['\u0E3A','්'],
]);

function thaiToSinhala(text) {
  if (!text) return text;
  // Reorder leading vowels (เ,โ come before consonant in Thai but after in Sinhala)
  let t = text.replace(/([เโ])([ก-ฮ])/g, '$2$1');
  let result = '';
  for (const ch of t) result += thaiToSinh.get(ch) || ch;
  
  // Merge อ + vowel sign → independent Sinhala vowel
  // In Thai Pali, อ is a vowel carrier; combined with vowel marks it forms independent vowels
  result = result
    .replace(/අා/g, 'ආ')   // อา → ā
    .replace(/අි/g, 'ඉ')    // อิ → i
    .replace(/අී/g, 'ඊ')    // อี → ī
    .replace(/අු/g, 'උ')    // อุ → u
    .replace(/අූ/g, 'ඌ')    // อู → ū
    .replace(/අෙ/g, 'එ')    // เอ → e
    .replace(/අො/g, 'ඔ');   // โอ → o
  
  return result;
}

let SQL = null;
let dictDbs = [];

export async function initDatabases() {
  SQL = await initSqlJs();
  for (const dict of THAI_DICTS) {
    const dbPath = path.join(DICTS_DIR, dict.file);
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      dictDbs.push({ ...dict, db: new SQL.Database(buffer) });
      console.log(`  ✓ ${dict.short} loaded`);
    }
  }
}

function execQuery(db, sql, params = {}) {
  const results = [];
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
  } catch (e) {
    console.error('SQL Error:', e.message);
  }
  return results;
}

// Flexible Sinhala pattern (optional virama between consonants)
function makeFlexPattern(sinhWord) {
  const consonants = 'කඛගඝඞචඡජඣඤටඨඩඪණතථදධනපඵබභමයරලළවසහඅ';
  let pattern = '';
  const chars = [...sinhWord];
  for (let i = 0; i < chars.length; i++) {
    pattern += chars[i];
    if (i < chars.length - 1 && consonants.includes(chars[i]) && consonants.includes(chars[i + 1])) {
      pattern += '%';
    }
  }
  return pattern + '%';
}

export function searchDict(word, limit = 200, dicts = null) {
  const sinhWord = thaiToSinhala(word);
  const pattern = makeFlexPattern(sinhWord);
  const results = [];
  for (const { short, db } of dictDbs) {
    if (dicts && Array.isArray(dicts) && dicts.length > 0 && !dicts.includes(short)) continue;
    const rows = execQuery(db, 
      'SELECT word, meaning FROM dictionary WHERE word LIKE $term LIMIT $limit', 
      { $term: pattern, $limit: limit }
    );
    rows.forEach(row => results.push({ dictName: short, word: row.word, meaning: row.meaning }));
  }
  return results;
}

export function reverseSearchDict(thaiTerm, limit = 200, dicts = null) {
  const pattern = `%${thaiTerm}%`;
  const results = [];
  for (const { short, db } of dictDbs) {
    if (dicts && Array.isArray(dicts) && dicts.length > 0 && !dicts.includes(short)) continue;
    const rows = execQuery(db,
      'SELECT word, meaning FROM dictionary WHERE meaning LIKE $term LIMIT $limit',
      { $term: pattern, $limit: limit }
    );
    rows.forEach(row => results.push({ dictName: short, word: row.word, meaning: row.meaning }));
  }
  return results;
}
