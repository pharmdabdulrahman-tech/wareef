import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import jpeg from 'jpeg-js';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = [
  'ghars-garden.jpg',
  'wareef-garden-sunrise.jpg',
  'wareef-garden-water.jpg',
];

function property(object, name, file) {
  return object.properties.find(item =>
    ts.isPropertyAssignment(item) &&
    (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) &&
    item.name.text === name)?.initializer;
}

// Inspect the slideshow that actually renders hero-photo images. This deliberately
// does not accept another image list elsewhere in the file.
function photoPaths(source) {
  const file = ts.createSourceFile('customer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const customer = file.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'CustomerPage');
  assert.ok(customer?.body, 'CustomerPage component must exist');

  const declarations = new Map();
  function collect(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, collect);
  }
  collect(file);

  const base = declarations.get('basePath');
  assert.equal(base?.getText(file), "import.meta.env.BASE_URL.replace(/\\/$/, \"\")",
    'Photo URLs must use the real app Vite base, not a mockup or fixed base');
  const asset = declarations.get('asset');
  assert.ok(asset && ts.isArrowFunction(asset) && asset.parameters.length === 1 &&
    ts.isTemplateExpression(asset.body), 'asset must safely prefix local paths');
  assert.equal(asset.body.head.text, '');
  assert.deepEqual(asset.body.templateSpans.map(span => [
    span.expression.getText(file), span.literal.text,
  ]), [['basePath', ''], [asset.parameters[0].name.getText(file), '']]);

  let hero;
  function findHero(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        node.tagName.getText(file) === 'img') {
      const className = node.attributes.properties.find(attr =>
        ts.isJsxAttribute(attr) && attr.name.getText(file) === 'className')?.initializer;
      if (className?.getText(file).includes('"hero-photo"')) {
        assert.equal(hero, undefined, 'There must be one rendered hero-photo JSX template');
        hero = node;
      }
    }
    ts.forEachChild(node, findHero);
  }
  findHero(customer.body);
  assert.ok(hero, 'The current homepage must render hero-photo images');

  let mapCall;
  for (let node = hero.parent; node; node = node.parent) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'map') {
      mapCall = node;
      break;
    }
  }
  assert.ok(mapCall && ts.isIdentifier(mapCall.expression.expression) &&
    mapCall.expression.expression.text === 'slides',
  'hero-photo must be rendered by mapping the homepage slides');
  const callback = mapCall.arguments[0];
  assert.ok(callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) &&
    ts.isIdentifier(callback.parameters[0]?.name), 'slides.map must expose its image path');
  const imageParameter = callback.parameters[0].name.text;

  const srcAttribute = hero.attributes.properties.find(attr =>
    ts.isJsxAttribute(attr) && attr.name.getText(file) === 'src')?.initializer;
  const src = srcAttribute && ts.isJsxExpression(srcAttribute) ? srcAttribute.expression : undefined;
  assert.ok(src && ts.isCallExpression(src) && ts.isIdentifier(src.expression) &&
    src.expression.text === 'asset' && src.arguments.length === 1 &&
    ts.isIdentifier(src.arguments[0]) && src.arguments[0].text === imageParameter,
  'hero-photo src must be asset(image), not an unsupported dynamic or external URL');

  const slides = declarations.get('slides');
  assert.ok(slides && ts.isArrayLiteralExpression(slides),
    'Homepage slides must be a statically verifiable array');
  const paths = slides.elements.map(element => {
    assert.ok(ts.isStringLiteral(element),
      'Every homepage slide must be a literal app-owned JPEG path');
    assert.match(element.text, /^\/images\/[a-z0-9-]+\.jpg$/,
      'Homepage slides must never use /__mockup or an external service');
    return element.text;
  });
  assert.deepEqual(paths, expected.map(name => `/images/${name}`),
    'All three rendered homepage garden photos must remain present');
  return paths;
}

const source = await readFile(new URL('../src/pages/customer.tsx', import.meta.url), 'utf8');

test('home slideshow guard rejects mockup, wrong base, missing slides, and dynamic hero sources', () => {
  photoPaths(source);
  assert.throws(() => photoPaths(source.replace(
    '"/images/ghars-garden.jpg"', '"/__mockup/images/ghars-garden.jpg"')));
  assert.throws(() => photoPaths(source.replace(
    'import.meta.env.BASE_URL', '"/wrong-base/"')));
  assert.throws(() => photoPaths(source.replace(
    ', "/images/wareef-garden-water.jpg"', '')));
  assert.throws(() => photoPaths(source.replace(
    'src={asset(image)}', 'src={window.heroPhoto(image)}')));
});

for (const base of ['/', '/wareef/']) {
  test(`all home photos resolve to decodable app-owned JPEGs at ${base}`, async () => {
    const paths = photoPaths(source);
    const server = await createServer({
      configFile: false, root, base, logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0, watch: null },
    });
    try {
      await server.listen();
      const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
      for (const path of paths) {
        const url = `${origin}${base.replace(/\/$/, '')}${path}`;
        const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
        assert.equal(response.status, 200, `${path}: must be served successfully`);
        assert.match(response.headers.get('content-type') ?? '', /^image\/jpeg\b/,
          `${path}: must not return an HTML fallback`);
        const bytes = Buffer.from(await response.arrayBuffer());
        const local = await readFile(new URL(`../public${path}`, import.meta.url));
        assert.deepEqual(bytes, local, `${path}: must come from Wareef public/images`);
        const image = jpeg.decode(bytes, { tolerantDecoding: false, maxMemoryUsageInMB: 128 });
        assert.ok(image.width > 0 && image.height > 0, `${path}: must decode to a real image`);
      }
    } finally {
      await server.close();
    }
  });
}