import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { registerV2Parts } from '../../js/engine_v2/partsExtra_v2.js';
import { PARTS_DB } from '../../js/data/parts.js';
import { ROSTER, characterOfPart, partSetLabel } from '../../js/engine_v2/roster_v2.js';

registerV2Parts();

// 문자열과 주석은 통째로 읽어, 스킬 함수 안의 중괄호와 메타데이터를 구분한다.
const source = await readFile(new URL('../../js/engine_v2/skills_v2.js', import.meta.url), 'utf8');
const tokens = source.match(/\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\])*'|"(?:\\[\s\S]|[^"\\])*"|`(?:\\[\s\S]|[^`\\])*`|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?|[^\s]/g)
    .filter(token => !token.startsWith('//') && !token.startsWith('/*'));

function properties(objectTokens, label) {
    if (objectTokens[0] !== '{' || objectTokens.at(-1) !== '}') {
        throw new Error(`${label}: 객체 리터럴을 찾을 수 없습니다.`);
    }
    const result = new Map();
    let start = 1;
    const stack = [];
    for (let i = 1; i < objectTokens.length; i++) {
        const token = objectTokens[i];
        if (stack.length === 0 && (token === ',' || i === objectTokens.length - 1)) {
            const entry = objectTokens.slice(start, i);
            if (entry.length) {
                if (entry[1] === ':') {
                    const key = /^[A-Za-z_$][\w$]*$/.test(entry[0]) ? entry[0] : literal([entry[0]], label);
                    result.set(key, entry.slice(2));
                } else if (entry[1] !== '(') {
                    throw new Error(`${label}: 지원하지 않는 속성 ${entry.join(' ')}`);
                }
            }
            start = i + 1;
            continue;
        }
        if (['{', '[', '('].includes(token)) stack.push(token);
        if (['}', ']', ')'].includes(token)) {
            const opening = stack.pop();
            if (opening !== { '}': '{', ']': '[', ')': '(' }[token]) {
                throw new Error(`${label}: 괄호가 맞지 않습니다.`);
            }
        }
    }
    if (stack.length) throw new Error(`${label}: 객체가 닫히지 않았습니다.`);
    return result;
}

function literal(valueTokens, label) {
    if (valueTokens?.length !== 1) throw new Error(`${label}: 문자열·숫자 리터럴이 필요합니다.`);
    const token = valueTokens[0];
    if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
    // 토큰 하나의 따옴표 문자열만 해석한다. 모듈이나 스킬 함수는 실행하지 않는다.
    if (token.startsWith("'") || token.startsWith('"')) return runInNewContext(token, Object.create(null));
    throw new Error(`${label}: 지원하지 않는 값 ${token}`);
}

function table(name) {
    const start = tokens.findIndex((token, i) => token === 'export' && tokens[i + 1] === 'const'
        && tokens[i + 2] === name && tokens[i + 3] === '=' && tokens[i + 4] === '{');
    if (start < 0) throw new Error(`${name}: 표를 찾을 수 없습니다.`);
    let depth = 0;
    for (let i = start + 4; i < tokens.length; i++) {
        if (tokens[i] === '{') depth++;
        if (tokens[i] === '}' && --depth === 0) return properties(tokens.slice(start + 4, i + 1), name);
    }
    throw new Error(`${name}: 표가 닫히지 않았습니다.`);
}

function metadata(valueTokens, label, withCooldown = false) {
    const fields = properties(valueTokens, label);
    const name = literal(fields.get('name'), `${label}.name`);
    const desc = literal(fields.get('desc'), `${label}.desc`);
    if (typeof name !== 'string' || typeof desc !== 'string') throw new Error(`${label}: 이름·설명은 문자열이어야 합니다.`);
    const cd = withCooldown && fields.has('cd') ? literal(fields.get('cd'), `${label}.cd`) : '';
    if (cd !== '' && typeof cd !== 'number') throw new Error(`${label}: 쿨다운은 숫자여야 합니다.`);
    return { name, desc, cd };
}

const partSkills = new Map([...table('PART_SKILL')].map(([id, value]) => [id, literal(value, `PART_SKILL.${id}`)]));
const skillTable = table('SKILLS');
const skills = new Map();
for (const key of new Set(partSkills.values())) {
    if (!skillTable.has(key)) throw new Error(`PART_SKILL의 스킬 ${key}를 SKILLS에서 찾을 수 없습니다.`);
    skills.set(key, metadata(skillTable.get(key), `SKILLS.${key}`, true));
}
const passives = new Map([...table('LEG_PASSIVES')].map(([id, value]) => [id, metadata(value, `LEG_PASSIVES.${id}`)]));

const slots = [ ['head', '머리', '필살기'], ['body', '몸통', '스킬 2'], ['arm', '팔', '스킬 1'], ['leg', '다리', '패시브'] ];
const columns = ['부위', '파츠 이름', 'id', '세트', '가격(DM)', '체력', '초당 피해', '사거리', '속도', '공격 방식', '스킬 종류', '스킬·패시브 이름', '쿨다운(초)', '설명'];
const groups = ROSTER.map(character => ({ ...character, rows: [] }));
const others = { id: null, faction: '기타', rows: [] };
for (const [slot, label, kind] of slots) {
    for (const part of PARTS_DB[slot] || []) {
        if (part.id === 'none') continue;
        const group = groups.find(character => character.id === characterOfPart(part)) || others;
        const skill = slot === 'leg' ? passives.get(part.id) : skills.get(partSkills.get(part.id));
        const stats = part.stats || {};
        group.rows.push([
            label, part.name, part.id, partSetLabel(part), part.cost ?? '',
            stats.hp ?? '', stats.dps ?? '', stats.range ?? '', stats.speed ?? '',
            slot === 'arm' ? part.attackType ?? '' : '', kind,
            skill?.name ?? '', skill?.cd ?? '', skill?.desc ?? part.skillDesc ?? ''
        ]);
    }
}
if (others.rows.length) groups.push(others);

function markdownCell(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r\n|\r|\n/g, '<br>');
}

function markdownRow(row) {
    return `| ${row.map(markdownCell).join(' | ')} |`;
}

function csvRow(row) {
    return row.map(value => {
        const text = String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(',');
}

const date = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
const markdown = [
    '# 파츠 스펙 표', '',
    '게임 데이터에서 자동 생성 — 직접 고치지 말고 `node tools/data/export_parts.mjs MD`로 다시 만든다', '',
    `만든 날짜: ${date}`, ''
];
const csv = [csvRow(['캐릭터', ...columns])];
for (const group of groups) {
    markdown.push(`## ${group.faction}`, '', markdownRow(columns), markdownRow(columns.map(() => '---')),
        ...group.rows.map(markdownRow), '');
    csv.push(...group.rows.map(row => csvRow([group.faction, ...row])));
}

const outputDir = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('./_out/', import.meta.url));
await mkdir(outputDir, { recursive: true });
const markdownPath = resolve(outputDir, '파츠_스펙표.md');
const csvPath = resolve(outputDir, '파츠_스펙표.csv');
await writeFile(markdownPath, markdown.join('\n') + '\n', 'utf8');
await writeFile(csvPath, '\uFEFF' + csv.join('\r\n') + '\r\n', 'utf8');
for (const group of groups) console.log(`${group.faction}: ${group.rows.length}개`);
console.log(markdownPath);
console.log(csvPath);
