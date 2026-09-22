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
const names = ['ghars-garden.jpg', 'wareef-garden-sunrise.jpg'];

// Inspect emitted JSX calls without executing the app (and therefore Clerk).
// Resolve only the string/base expressions used by the photos, never arbitrary JS.
function builtPhotoPaths(source) {
  const file = ts.createSourceFile('bundle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declarations = new Map();
  const images = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      declarations.set(node.name.text, node.initializer);
    }
    if (ts.isCallExpression(node) && node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'img') {
      const props = node.arguments[1];
      if (props && ts.isObjectLiteralExpression(props)) {
        const src = props.properties.find(prop => ts.isPropertyAssignment(prop) &&
          (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) && prop.name.text === 'src');
        if (src) images.push(src.initializer);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  function value(node, depth = 0) {
    assert.ok(node && depth < 10, 'Photo URL must be statically resolvable');
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isIdentifier(node)) return value(declarations.get(node.text), depth + 1);
    if (ts.isTemplateExpression(node)) {
      return node.head.text + node.templateSpans.map(span =>
        value(span.expression, depth + 1) + span.literal.text).join('');
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'replace' && node.arguments.length === 2 &&
        node.arguments[0].getText(file) === '/\\/$/' &&
        ts.isStringLiteral(node.arguments[1]) && node.arguments[1].text === '') {
      return value(node.expression.expression, depth + 1).replace(/\/$/, '');
    }
    assert.fail(`Unsupported compiled photo expression: ${node.getText(file)}`);
  }
  return images.map(node => value(node));
}

function assertPhotoPaths(source, base) {
  const paths = builtPhotoPaths(source);
  assert.deepEqual(paths, names.map(name => `${base}images/${name}`),
    'Compiled home photos must use the real app base, never /__mockup or a root-only URL');
  return paths;
}

test('production guard rejects wrong-base, mockup and missing image links', () => {
  const fixture = 'const base="/wareef/".replace(/\\/$/,"");' +
    names.map(name => `jsx("img",{src:\`\${base}/images/${name}\`});`).join('');
  assertPhotoPaths(fixture, '/wareef/');
  assert.throws(() => assertPhotoPaths(fixture.replace('"/wareef/"', '"/"'), '/wareef/'));
  assert.throws(() => assertPhotoPaths(fixture.replace('"/wareef/"', '"/__mockup/"'), '/wareef/'));
  assert.throws(() => assertPhotoPaths(fixture.replace(names[0], 'missing.jpg'), '/wareef/'));
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
      // Only dist/public is served here, not source/public or the mockup service.
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
        assert.ok(entry?.startsWith(`${base}assets/`), 'Built HTML must load its app bundle under the base');
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