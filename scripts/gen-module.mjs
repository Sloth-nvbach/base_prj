// Scaffolds a new feature by copying the `notes` reference module (BE + FE + tests)
// and renaming it. Usage:
//   npm run gen:module -- product                 -> /api/products, /products
//   npm run gen:module -- lesson-plan             -> /api/lesson-plans, /lesson-plans
//   npm run gen:module -- person --plural people  -> custom plural
//   npm run gen:module -- product --remove        -> deletes a generated module again
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BE_APP = 'BE/src/app.ts';
const FE_MODULES = 'FE/src/app/modules.ts';

// ---------------------------------------------------------------- arguments
const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  args.splice(index, value && !value.startsWith('--') ? 2 : 1);
  return value ?? true;
};
const remove = flag('--remove') !== undefined;
const pluralArg = flag('--plural');
const singular = args[0];

const fail = (message) => {
  console.error(`\n  ${message}\n`);
  process.exit(1);
};

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// Names (singular or plural) owned by the base project: never generate or remove them.
const RESERVED = new Set(['note', 'notes', 'user', 'users', 'auth', 'profile', 'profiles', 'home', 'chat', 'chats', 'ai', 'admin', 'admins', 'app', 'apps', 'common', 'shared', 'test', 'tests']);
const GENERATED_HEADER = '// Generated from the notes reference module by `npm run gen:module`.\n';

const read = (path) => readFileSync(join(root, path), 'utf8');
const isGenerated = (path) => existsSync(join(root, path)) && read(path).startsWith(GENERATED_HEADER);

if (!singular) fail('Usage: npm run gen:module -- <name> [--plural <plural>] [--remove]   e.g. product, lesson-plan');
if (!KEBAB.test(singular)) fail(`"${singular}" must be lowercase words joined by "-" (e.g. product, lesson-plan).`);
if (RESERVED.has(singular)) fail(`"${singular}" is already used by the base project. Pick another name.`);
// "note" is the token being renamed, so names that contain it would be renamed twice.
if (singular.includes('note')) fail(`Names containing "note" are not supported (e.g. "${singular}"). Pick another name.`);

/** On remove, the plural is read back from the router mount line that generate wrote. */
const detectPlural = () => {
  const camelName = singular.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const mount = read(BE_APP).match(new RegExp(`app\\.use\\('/api/([a-z0-9-]+)', ${camelName}Router\\);`));
  return mount?.[1];
};

const plural =
  typeof pluralArg === 'string' ? pluralArg : (remove && detectPlural()) || `${singular}s`;
if (!KEBAB.test(plural) || plural === singular) fail(`Invalid plural "${plural}".`);
if (RESERVED.has(plural) || plural.includes('note')) fail(`"${plural}" is already used by the base project. Pick another name.`);

// ---------------------------------------------------------------- name forms
const words = (kebab) => kebab.split('-');
const pascal = (kebab) => words(kebab).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const camel = (kebab) => pascal(kebab)[0].toLowerCase() + pascal(kebab).slice(1);
const human = (kebab) => words(kebab).join(' ');
const capitalize = (text) => text[0].toUpperCase() + text.slice(1);

const forms = {
  Notes: { code: pascal(plural), path: pascal(plural), text: capitalize(human(plural)) },
  Note: { code: pascal(singular), path: pascal(singular), text: capitalize(human(singular)) },
  notes: { code: camel(plural), path: plural, text: human(plural) },
  note: { code: camel(singular), path: singular, text: human(singular) },
};
const TOKEN = /Notes|Note|notes|note/g;
// Text between JSX tags: starts with a letter, only words and simple punctuation.
const JSX_TEXT = />\s*([A-Za-z][A-Za-z0-9 .,!?#-]*?)\s*(?=[<{])/g;

/**
 * Renames every "note" token according to where it appears:
 * - code (identifiers):               noteKeys -> lessonPlanKeys
 * - strings without spaces (paths):   '/notes', '../api/notes.api' -> '/lesson-plans'
 * - strings with spaces (UI text):    'Note not found' -> 'Lesson plan not found'
 */
const renameIn = (source, isJsx) => {
  const replaceAs = (text, kind) => text.replace(TOKEN, (token) => forms[token][kind]);
  const inString = (body) => replaceAs(body, /\s/.test(body) ? 'text' : 'path');
  // Double quotes are JSX attributes: title="Notes" is UI text, id="all-notes" an id.
  const inAttribute = (body) =>
    /\s/.test(body) ? replaceAs(body, 'text') : body.replace(TOKEN, (token) => forms[token][/^[A-Z]/.test(token) ? 'text' : 'path']);

  // JSX text such as `>New note<` is UI text, not code.
  const withJsxText = !isJsx ? source : source.replace(JSX_TEXT, (match, text) => match.replace(text, replaceAs(text, 'text')));

  return withJsxText.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|[^'"`]+/g, (chunk) => {
    if (chunk.startsWith("'")) return inString(chunk);
    if (chunk.startsWith('"')) return inAttribute(chunk);
    if (!chunk.startsWith('`')) return replaceAs(chunk, 'code');
    // Template literal: text parts follow the string rules, ${...} parts the code rules.
    return chunk.replace(/\$\{[^}]*\}|[^$]+|\$/g, (part) => (part.startsWith('${') ? replaceAs(part, 'code') : inString(part)));
  });
};

// Applied before renaming: content that must not go through the rename rules.
const beforeRename = (source) =>
  source
    .replace(/\/\/ Reference module(?: tests)?: .*\n/g, '')
    .replace('description="Example feature: list, search, create, edit and delete."', `description="Manage your ${human(plural)}."`)
    .replace(/\bStickyNote\b/g, 'Boxes');


// ---------------------------------------------------------------- files
const FILES = [
  ['BE/src/models/note.model.ts', `BE/src/models/${singular}.model.ts`],
  ['BE/src/validators/note.validator.ts', `BE/src/validators/${singular}.validator.ts`],
  ['BE/src/services/note.service.ts', `BE/src/services/${singular}.service.ts`],
  ['BE/src/controllers/note.controller.ts', `BE/src/controllers/${singular}.controller.ts`],
  ['BE/src/routes/note.route.ts', `BE/src/routes/${singular}.route.ts`],
  ['BE/tests/integration/notes.test.ts', `BE/tests/integration/${plural}.test.ts`],
  ['FE/src/modules/notes/types/note.types.ts', `FE/src/modules/${plural}/types/${singular}.types.ts`],
  ['FE/src/modules/notes/api/notes.api.ts', `FE/src/modules/${plural}/api/${plural}.api.ts`],
  ['FE/src/modules/notes/hooks/use-notes.ts', `FE/src/modules/${plural}/hooks/use-${plural}.ts`],
  ['FE/src/modules/notes/components/NoteCard.tsx', `FE/src/modules/${plural}/components/${pascal(singular)}Card.tsx`],
  ['FE/src/modules/notes/components/NoteFormDialog.tsx', `FE/src/modules/${plural}/components/${pascal(singular)}FormDialog.tsx`],
  ['FE/src/modules/notes/pages/NotesListPage.tsx', `FE/src/modules/${plural}/pages/${pascal(plural)}ListPage.tsx`],
  ['FE/src/modules/notes/pages/NotesListPage.test.tsx', `FE/src/modules/${plural}/pages/${pascal(plural)}ListPage.test.tsx`],
  ['FE/src/modules/notes/notes.module.ts', `FE/src/modules/${plural}/${plural}.module.ts`],
];

const write = (path, content) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};

const routerImport = `import { ${camel(singular)}Router } from './routes/${singular}.route';\n`;
const routerMount = `app.use('/api/${plural}', ${camel(singular)}Router);\n`;
const moduleImport = `import { ${camel(plural)}Module } from '@/modules/${plural}/${plural}.module';\n`;
const moduleEntry = `${camel(plural)}Module`;

const insertAfterLast = (source, pattern, text) => {
  const matches = [...source.matchAll(pattern)];
  if (!matches.length) fail(`Could not find where to register the module (pattern ${pattern}).`);
  const last = matches[matches.length - 1];
  const at = last.index + last[0].length;
  return source.slice(0, at) + text + source.slice(at);
};

/** Deletes empty sub-folders left after removing generated files. */
const pruneEmptyDirs = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = join(dir, entry.name);
    pruneEmptyDirs(child);
    if (readdirSync(child).length === 0) rmSync(child, { recursive: true });
  }
};

// ---------------------------------------------------------------- remove
if (remove) {
  // Only touch files this script created: each one starts with the generated header.
  const routeFile = `BE/src/routes/${singular}.route.ts`;
  if (!isGenerated(routeFile)) fail(`"${singular}" was not created by gen:module (no generated ${routeFile}). Nothing removed.`);

  const removed = [];
  for (const [, target] of FILES) {
    if (isGenerated(target)) {
      rmSync(join(root, target));
      removed.push(target);
    }
  }
  const feDir = `FE/src/modules/${plural}`;
  if (existsSync(join(root, feDir))) {
    const leftovers = readdirSync(join(root, feDir), { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
    if (leftovers.length === 0) rmSync(join(root, feDir), { recursive: true });
    else {
      pruneEmptyDirs(join(root, feDir));
      console.warn(`Kept ${feDir}: it contains files you added (${leftovers.map((entry) => entry.name).join(', ')}).`);
    }
  }

  write(BE_APP, read(BE_APP).replace(routerImport, '').replace(routerMount, ''));
  write(FE_MODULES, read(FE_MODULES).replace(moduleImport, '').replace(new RegExp(`,\\s*${moduleEntry}\\b`), ''));
  console.log(`Removed the "${plural}" module:\n${removed.map((path) => `  ${path}`).join('\n')}`);
  process.exit(0);
}

// ---------------------------------------------------------------- generate
const existing = FILES.map(([, target]) => target).filter((target) => existsSync(join(root, target)));
if (existing.length || existsSync(join(root, `FE/src/modules/${plural}`))) {
  fail(`Module "${plural}" already exists:\n    ${existing.join('\n    ') || `FE/src/modules/${plural}`}`);
}

// Renamed identifiers must not clash with names the template already uses
// (e.g. "query" -> useQuery, "page" -> page) or with JavaScript keywords ("class").
const JS_RESERVED = new Set(
  ('break case catch class const continue debugger default delete do else enum export extends false finally for ' +
    'function if import in instanceof new null return super switch this throw true try typeof var void while with ' +
    'yield let static implements interface package private protected public await async of type as from get set ' +
    'Object Array String Number Boolean Date Error Map Set Promise Record Partial JSON Math')
    .split(' '),
);
const codeOnly = (source, isJsx) =>
  (isJsx ? source.replace(JSX_TEXT, '>') : source)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, ' ');
const identifiers = new Set(
  FILES.flatMap(([source]) => codeOnly(read(source), source.endsWith('.tsx')).match(/[A-Za-z_$][\w$]*/g) ?? []),
);
const taken = new Set([...JS_RESERVED, ...[...identifiers].filter((id) => !/note/i.test(id))]);
const clashes = [...identifiers]
  .filter((id) => /Notes|Note|notes|note/.test(id))
  .map((id) => id.replace(TOKEN, (token) => forms[token].code))
  .filter((id) => taken.has(id));
if (clashes.length) {
  fail(`"${singular}" would create names that already exist in the code: ${[...new Set(clashes)].join(', ')}. Pick another name.`);
}

for (const [source, target] of FILES) write(target, GENERATED_HEADER + renameIn(beforeRename(read(source)), target.endsWith('.tsx')));

let app = read(BE_APP);
app = insertAfterLast(app, /^import .* from '\.\/routes\/.*';\n/gm, routerImport);
app = insertAfterLast(app, /^app\.use\('\/api\/.*Router\);\n/gm, routerMount);
write(BE_APP, app);

let modules = read(FE_MODULES);
modules = insertAfterLast(modules, /^import .* from '@\/modules\/.*';\n/gm, moduleImport);
modules = modules.replace(/(export const appModules: AppModule\[\] = \[[^\]]*?)(\s*\])/, `$1, ${moduleEntry}$2`);
write(FE_MODULES, modules);

console.log(`
Created the "${plural}" module (copied from notes):
${FILES.map(([, target]) => `  ${target}`).join('\n')}

Registered:
  ${BE_APP}      -> /api/${plural}
  ${FE_MODULES}  -> /${plural} (nav link "${capitalize(human(plural))}")

Next:
  1. Change the fields (title, content, tags) in the model, validator, types and form.
  2. Run the tests: npm test
`);
