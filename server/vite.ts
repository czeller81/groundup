import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { applyDocumentLocale } from "./document-locale";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      const requestPath = new URL(req.originalUrl, "http://localhost").pathname.replace(/\/+$/, "") || "/";

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = applyDocumentLocale(template, requestPath);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      const knownPublicPaths = new Set([
        "/", "/schedule", "/pricing", "/coaches", "/personal-training",
         "/contact", "/privacy", "/book", "/womens-self-defense", "/kids", "/girls", "/adaptive-capacity", "/discovery-pass",
         "/", "/admin", "/ln/login", "/es", "/es/personal-training", "/es/coaches", "/es/pricing", "/es/programas", "/es/horario", "/es/reservar", "/es/contacto", "/es/privacidad", "/es/womens-self-defense", "/es/girls", "/es/kids", "/es/adaptive-capacity", "/es/portal/login", "/es/portal/reset-password",
         "/es/discovery-pass",
      ]);
      const isPortalPath = requestPath === "/portal" || requestPath.startsWith("/portal/") ||
        requestPath === "/es/portal" || requestPath.startsWith("/es/portal/");
      if (!knownPublicPaths.has(requestPath) && !isPortalPath) {
        return res.status(404).type("text").send("Not found");
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { dotfiles: "ignore", index: false }));

  // Keep SPA navigation working, but give crawlers and clients a real 404 status
  // for routes that are not part of the public or portal application.
  app.use("*", async (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Not found" });
    }
    const requestPath = new URL(req.originalUrl, "http://localhost").pathname.replace(/\/+$/, "") || "/";
    const knownPublicPaths = new Set([
      "/", "/schedule", "/pricing", "/coaches", "/personal-training",
       "/contact", "/privacy", "/book", "/womens-self-defense", "/kids", "/girls", "/adaptive-capacity", "/discovery-pass",
       "/", "/admin", "/ln/login", "/es", "/es/personal-training", "/es/coaches", "/es/pricing", "/es/programas", "/es/horario", "/es/reservar", "/es/contacto", "/es/privacidad", "/es/womens-self-defense", "/es/girls", "/es/kids", "/es/adaptive-capacity", "/es/portal/login", "/es/portal/reset-password",
       "/es/discovery-pass",
    ]);
    const isPortalPath = requestPath === "/portal" || requestPath.startsWith("/portal/") ||
      requestPath === "/es/portal" || requestPath.startsWith("/es/portal/");
    if (!knownPublicPaths.has(requestPath) && !isPortalPath) {
      return res.status(404).type("text").send("Not found");
    }
    try {
      const indexPath = path.resolve(distPath, "index.html");
      const html = applyDocumentLocale(await fs.promises.readFile(indexPath, "utf-8"), requestPath);
      res.status(200).type("html").send(html);
    } catch (error) {
      next(error);
    }
  });
}
