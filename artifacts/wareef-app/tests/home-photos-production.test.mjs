import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import jpeg from 'jpeg-js';
import ts from 'typescript';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const run = promisify(execFile);
const names = [
  'ghars-garden.jpg',
  'wareef-garden-sunrise.jpg',
  'wareef-garden-water.jpg',
];

function namedProperty(object, name) {
  return object.properties.find(item =>
    ts.isPropertyAssignment(item) &&
    (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
    item.name.text === name)?.initializer;
}

function functionScope(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current) || ts.isSourceFile(current)) return current;
  }
}

// Resolve an identifier lexically enough for minified const declarations without
// depending on their generated names.
function declarationFor(identifier, declarations) {
  const usageScopes = [];
  for (let node = identifier; node; node = node.parent) {
    if (ts.isFunctionLike(node) || ts.isSourceFile(node)) usageScopes.push(node);
  }
  for (const scope of usageScopes) {
    const matches = declarations.filter(item =>
      item.name.text === identifier.text &&
      functionScope(item) === scope &&
      item.pos < identifier.pos);
    if (matches.length) return matches.at(-1);
  }
}

function staticClassValues(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
  if (ts.isConditionalExpression(node)) {
    return [
      ...staticClassValues(node.whenTrue),
      ...staticClassValues(node.whenFalse),
    ];
  }
  return [];
}

// Inspect only the emitted img template carrying the stable hero-photo class.
// The evaluator supports a deliberately tiny expression language and never runs
// bundle code.
function builtPhotoPaths(source) {
  const file = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = [];
  const heroImages = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      declarations.push(node);
    }
    if (ts.isCallExpression(node) && node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'img' &&
        node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
      const className = namedProperty(node.arguments[1], 'className');
      if (className && staticClassValues(className).some(value =>
        value.split(/\s+/).includes('hero-photo'))) {
        heroImages.push(node);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  assert.equal(heroImages.length, 1,
    'Compiled homepage must contain one mapped hero-photo image template');
  const hero = heroImages[0];

  let mapCall;
  for (let node = hero.parent; node; node = node.parent) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'map') {
      mapCall = node;
      break;
    }
  }
  assert.ok(mapCall, 'Compiled hero-photo must be produced by slides.map');
  const callback = mapCall.arguments[0];
  assert.ok(callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
    ts.isIdentifier(callback.parameters[0]?.name),
  'Compiled slideshow map must expose its image path');
  const imageParameter = callback.parameters[0].name.text;

  const src = namedProperty(hero.arguments[1], 'src');
  assert.ok(src && ts.isCallExpression(src) && ts.isIdentifier(src.expression) &&
    src.arguments.length === 1 && ts.isIdentifier(src.arguments[0]) &&
    src.arguments[0].text === imageParameter,
  'Compiled hero src must pass the mapped slide through a static asset helper');

  function value(node, environment = new Map(), depth = 0) {
    assert.ok(node && depth < 12, 'Hero photo URL must be statically resolvable');
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map(element => value(element, environment, depth + 1));
    }
    if (ts.isIdentifier(node)) {
      if (environment.has(node.text)) return environment.get(node.text);
      const declaration = declarationFor(node, declarations);
      assert.ok(declaration, `No static declaration for hero value ${node.text}`);
      return value(declaration.initializer, environment, depth + 1);
    }
    if (ts.isTemplateExpression(node)) {
      return node.head.text + node.templateSpans.map(span =>
        value(span.expression, environment, depth + 1) + span.literal.text).join('');
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'replace' && node.arguments.length === 2 &&
        node.arguments[0].getText(file) === '/\\/$/' &&
        ts.isStringLiteral(node.arguments[1]) && node.arguments[1].text === '') {
      const input = value(node.expression.expression, environment, depth + 1);
      assert.equal(typeof input, 'string', 'replace input must be a static string');
      return input.replace(/\/$/, '');
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const declaration = declarationFor(node.expression, declarations);
      const helper = declaration?.initializer;
      assert.ok(helper && (ts.isArrowFunction(helper) || ts.isFunctionExpression(helper)) &&
        helper.parameters.every(parameter => ts.isIdentifier(parameter.name)),
      'Hero asset helper must be a statically analyzable function');
      const body = ts.isBlock(helper.body)
        ? helper.body.statements.find(statement => ts.isReturnStatement(statement))?.expression
        : helper.body;
      assert.ok(body, 'Hero asset helper must return a value');
      const next = new Map(environment);
      helper.parameters.forEach((parameter, index) => {
        next.set(parameter.name.text, value(node.arguments[index], environment, depth + 1));
      });
      return value(body, next, depth + 1);
    }
    if (ts.isParenthesizedExpression(node)) return value(node.expression, environment, depth + 1);
    assert.fail(`Unsupported compiled hero expression: ${node.getText(file)}`);
  }

  assert.ok(ts.isPropertyAccessExpression(mapCall.expression),
    'Compiled slideshow must use a property map call');
  const slides = value(mapCall.expression.expression);
  assert.ok(Array.isArray(slides), 'Compiled slideshow source must resolve to an array');
  return slides.map(image => {
    assert.equal(typeof image, 'string', 'Every compiled slide must be a static string');
    const environment = new Map([[imageParameter, image]]);
    return value(src, environment);
  });
}

function assertPhotoPaths(source, base) {
  const paths = builtPhotoPaths(source);
  assert.deepEqual(paths, names.map(name => `${base}images/${name}`),
    'Compiled homepage photos must use the real app base and contain all three slides');
  return paths;
}

function fixture(base = '/wareef/', slides = names, src = 'asset(image)') {
  return `const base=${JSON.stringify(base)}.replace(/\\/$/,"");` +
    'const asset=path=>`${base}${path}`;' +
    `const slides=${JSON.stringify(slides.map(name => `/images/${name}`))};` +
    `slides.map((image,index)=>jsx("img",{className:index?"hero-photo":"hero-photo current",src:${src}}));` +
    'jsx("img",{src:product.image});';
}

test('production guard rejects wrong-base, mockup, missing slides, and unsupported dynamic hero src', () => {
  assertPhotoPaths(fixture(), '/wareef/');
  assert.throws(() => assertPhotoPaths(fixture('/'), '/wareef/'));
  assert.throws(() => assertPhotoPaths(fixture('/__mockup/'), '/wareef/'));
  assert.throws(() => assertPhotoPaths(fixture('/wareef/', names.slice(0, 2)), '/wareef/'));
  assert.throws(() => assertPhotoPaths(fixture('/wareef/', names, 'window.photo(image)'), '/wareef/'));
});

// Sequential builds share the real output directory; finish with the normal root build.
test('publish-ready garden photos', { timeout: 120_000 }, async t => {
  for (const base of ['/wareef/', '/']) {
    await t.test(`production JPEGs at ${base}`, async () => {
      await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.ts'], {
        cwd: root,
        env: { ...process.env, NODE_ENV: 'production', PORT: '4173', BASE_PATH: base },
        timeout: 60_000,
      });
      const server = await preview({
        configFile: false, root, base, logLevel: 'silent',
        build: { outDir: 'dist/public' },
        preview: { host: '127.0.0.1', port: 0, open: false },
      });
      try {
        const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
        const get = path => fetch(`${origin}${path}`, {
          redirect: 'error', signal: AbortSignal.timeout(5000),
        });
        const htmlResponse = await get(base);
        assert.equal(htmlResponse.status, 200);
        const html = await htmlResponse.text();
        const entry = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/)?.[1];
        assert.ok(entry?.startsWith(`${base}assets/`),
          'Built HTML must load its app bundle under the base');
        const bundleResponse = await get(entry);
        assert.equal(bundleResponse.status, 200);
        assert.match(bundleResponse.headers.get('content-type') ?? '', /javascript/);
        const paths = assertPhotoPaths(await bundleResponse.text(), base);
        for (const [index, path] of paths.entries()) {
          const response = await get(path);
          assert.equal(response.status, 200, `${path}: missing production photo`);
          assert.match(response.headers.get('content-type') ?? '', /^image\/jpeg\b/,
            `${path}: HTML fallback is not a photo`);
          const bytes = Buffer.from(await response.arrayBuffer());
          const packaged = await readFile(`${root}dist/public/images/${names[index]}`);
          const original = await readFile(`${root}public/images/${names[index]}`);
          assert.deepEqual(bytes, packaged, 'Response must come from the build output');
          assert.deepEqual(packaged, original, 'Build must package the real Wareef photo');
          const image = jpeg.decode(bytes, { tolerantDecoding: false, maxMemoryUsageInMB: 128 });
          assert.ok(image.width > 0 && image.height > 0, `${path}: must decode`);
        }
      } finally {
        await new Promise((resolve, reject) => {
          server.httpServer.close(error => error ? reject(error) : resolve());
          server.httpServer.closeAllConnections();
        });
      }
    });
  }
});