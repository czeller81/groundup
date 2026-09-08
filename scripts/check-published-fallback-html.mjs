import assert from "node:assert/strict";

const baseUrl = process.argv[2] || process.env.PUBLISHED_URL;

if (!baseUrl) {
  console.error("Usage: node scripts/check-published-fallback-html.mjs <published-url>");
  console.error("Or set PUBLISHED_URL to the published app URL.");
  process.exit(2);
}

const routes = [
  {
    path: "/",
    language: "en",
    title: "Women-Only BJJ & Self-Defense in Oxnard | Ground Up",
    content: "Women-Only Brazilian Jiu-Jitsu and Self-Defense in Oxnard",
    expectedDestination: "/discovery-pass",
    destinationLabel: "Discovery Pass",
  },
  {
    path: "/es",
    language: "es",
    title: "Jiu-Jitsu y Defensa Personal Solo para Mujeres en Oxnard",
    content: "Jiu-Jitsu Brasileño y Defensa Personal para Mujeres en Oxnard",
    expectedDestination: "/es/discovery-pass",
    destinationLabel: "Discovery Pass",
  },
  {
    path: "/girls",
    language: "en",
    title: "Girls & Mother-Daughter Training | Ground Up Oxnard",
    content: "Girls and Mother-Daughter Training",
    expectedDestination: "/contact",
    destinationLabel: "eligibility/contact",
  },
  {
    path: "/es/girls",
    language: "es",
    title: "Jiu-Jitsu para Niñas y Madres e Hijas | Ground Up Oxnard",
    content: "Entrenamiento para Niñas y Madres e Hijas",
    expectedDestination: "/es/contacto",
    destinationLabel: "eligibility/contact",
  },
];

for (const route of routes) {
  const url = new URL(route.path, baseUrl).toString();
  let response;
  try {
    response = await fetch(url, { redirect: "manual" });
  } catch (error) {
    throw new Error(`${route.path}: request failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }

  assert.equal(response.status, 200, `${route.path}: expected HTTP 200, received ${response.status}`);
  assert.match(
    response.headers.get("content-type") || "",
    /text\/html/i,
    `${route.path}: expected an HTML response`,
  );

  const html = await response.text();
  const languageMatch = html.match(/<html\b[^>]*\blang="([^"]+)"/i);
  assert.equal(
    languageMatch?.[1],
    route.language,
    `${route.path}: expected response language "${route.language}"`,
  );
  assert.ok(
    html.includes(`<title>${escapeHtml(route.title)}</title>`),
    `${route.path}: expected localized title "${route.title}"`,
  );
  assert.ok(
    html.includes(route.content),
    `${route.path}: expected localized fallback content "${route.content}"`,
  );
  assert.ok(
    html.includes(`href="${route.expectedDestination}"`),
    `${route.path}: expected ${route.destinationLabel} destination "${route.expectedDestination}"`,
  );

  if (route.destinationLabel === "eligibility/contact") {
    assert.ok(
      !html.includes("href=\"/discovery-pass\"") && !html.includes("href=\"/es/discovery-pass\""),
      `${route.path}: eligibility/contact fallback must not link to a Discovery Pass`,
    );
  }

  console.log(
    `PASS ${route.path}: lang=${route.language}, localized title/content, ${route.destinationLabel}=${route.expectedDestination}`,
  );
}

console.log(`Published fallback HTML OK: ${routes.length} English/Spanish routes checked at ${baseUrl}`);

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}