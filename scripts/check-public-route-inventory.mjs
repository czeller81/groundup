import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(projectRoot, "client/src/App.tsx");
const inventoryPath = path.join(projectRoot, "client/src/public-route-inventory.ts");
const pagesDirectory = path.join(projectRoot, "client/src/pages");

const appSource = fs.readFileSync(appPath, "utf8");
const inventorySource = fs.readFileSync(inventoryPath, "utf8");

const inventoryEntries = [...inventorySource.matchAll(
  /\{ id: "([^"]+)", englishPath: "([^"]+)", spanishPath: "([^"]+)", englishComponent: "([^"]+)", spanishComponent: "([^"]+)" \}/g,
)].map(([, id, englishPath, spanishPath, englishComponent, spanishComponent]) => ({
  id,
  englishPath,
  spanishPath,
  englishComponent,
  spanishComponent,
}));

const aliasEntries = [...inventorySource.matchAll(
  /\{ path: "([^"]+)", canonicalPath: "([^"]+)" \}/g,
)].map(([, pathName, canonicalPath]) => ({ path: pathName, canonicalPath }));

assert.ok(inventoryEntries.length > 0, "The public route inventory must contain at least one page.");
assert.equal(
  new Set(inventoryEntries.map(({ id }) => id)).size,
  inventoryEntries.length,
  "Public route inventory IDs must be unique.",
);

const inventoryPaths = inventoryEntries.flatMap(({ englishPath, spanishPath }) => [englishPath, spanishPath]);
assert.equal(
  new Set(inventoryPaths).size,
  inventoryPaths.length,
  "Each canonical public route path must appear only once in the inventory.",
);

for (const entry of inventoryEntries) {
  assert.notEqual(entry.englishPath, entry.spanishPath, `${entry.id} must have distinct English and Spanish paths.`);
  assert.ok(entry.englishComponent, `${entry.id} needs an English canonical component.`);
  assert.ok(entry.spanishComponent, `${entry.id} needs a Spanish equivalent component.`);
}

const routePaths = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map(([, routePath]) => routePath);
const publicRoutePaths = routePaths.filter(
  (routePath) => !routePath.startsWith("/portal") && !routePath.startsWith("/es/portal") && routePath !== "/admin" && routePath !== "/ln/login",
);
const expectedPublicPaths = new Set([...inventoryPaths, ...aliasEntries.map(({ path: aliasPath }) => aliasPath)]);
assert.deepEqual(
  new Set(publicRoutePaths),
  expectedPublicPaths,
  "Every public route must be inventoried, and every inventory entry must be mounted in App.tsx.",
);

for (const { path: aliasPath, canonicalPath } of aliasEntries) {
  const routeBlock = appSource.match(new RegExp(`<Route path="${escapeRegExp(aliasPath)}">([\\s\\S]*?)</Route>`));
  assert.ok(routeBlock, `${aliasPath} must have an explicit route block.`);
  assert.match(
    routeBlock[1],
    new RegExp(`<Redirect\\s+to="${escapeRegExp(canonicalPath)}"`),
    `${aliasPath} must redirect to ${canonicalPath} instead of rendering another page.`,
  );
}

const topLevelPageFiles = fs.readdirSync(pagesDirectory)
  .filter((fileName) => fileName.endsWith(".tsx"))
  .map((fileName) => fileName.slice(0, -".tsx".length));
const appPageImports = new Set(
  [...appSource.matchAll(/from ["']@\/pages\/([^"']+)["']/g)].map(([, modulePath]) => modulePath),
);
const orphanPageFiles = topLevelPageFiles.filter((fileName) => !appPageImports.has(fileName));
assert.deepEqual(
  orphanPageFiles,
  [],
  `Every top-level page module must have one mounted canonical owner. Orphans: ${orphanPageFiles.join(", ")}`,
);

console.log(`Public route inventory OK: ${inventoryEntries.length} locale-paired pages, ${aliasEntries.length} redirects.`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}