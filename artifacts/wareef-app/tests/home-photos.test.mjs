import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import jpeg from 'jpeg-js';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = ['ghars-garden.jpg', 'wareef-garden-sunrise.jpg'];

// Read the actual JSX, not a second list of URLs that could pass after the UI breaks.
function photoPaths(source) {
  const file = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const landing = file.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'Landing');
  assert.ok(landing, 'Landing component must exist');
  const base = file.statements.flatMap(node =>
    ts.isVariableStatement(node) ? [...node.declarationList.declarations] : [])
    .find(node => node.name.getText(file) === 'basePath');
  assert.equal(base?.initializer?.getText(file),
    "import.meta.env.BASE_URL.replace(/\\/$/, '')",
    'Photo URLs must use the real app Vite base, not a mockup base');

  const paths = [];
  function visit(node) {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        node.tagName.getText(file) === 'img') {
      const src = node.attributes.properties.find(attr =>
        ts.isJsxAttribute(attr) && attr.name.getText(file) === 'src')?.initializer;
      const expression = src && ts.isJsxExpression(src) ? src.expression : undefined;
      assert.ok(expression && ts.isTemplateExpression(expression),
        'Home photos must use a basePath-prefixed local image URL');
      assert.equal(expression.head.text, '');
      assert.equal(expression.templateSpans.length, 1);
      const span = expression.templateSpans[0];
      assert.equal(span.expression.getText(file), 'basePath');
      assert.match(span.literal.text, /^\/images\/[a-z0-9-]+\.jpg$/,
        'Home photos must belong to this app, never /__mockup or an external service');
      paths.push(span.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(landing);
  assert.deepEqual(paths, expected.map(name => `/images/${name}`),
    'Both home-page garden photos must remain present');
  return paths;
}

const source = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('home photo guard rejects mockup URLs and missing photos', () => {
  assert.throws(() => photoPaths(source.replace(
    '${basePath}/images/ghars-garden.jpg', '/__mockup/images/ghars-garden.jpg')));
  assert.throws(() => photoPaths(source.replace(
    '${basePath}/images/ghars-garden.jpg', '${basePath}/images/missing.jpg')));
});

for (const base of ['/', '/wareef/']) {
  test(`both home photos resolve to decodable app-owned JPEGs at ${base}`, async () => {
    const paths = photoPaths(source);
    // Isolated static Vite server: no Clerk, backend, mockup service, or account required.
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