import type { Express } from "express";
import { storage } from "./storage";
import { requireAuth } from "./route-security";
import {
  isMemberAiSelfServiceEnabled,
  memberAiSchemaReadyMiddleware,
} from "./ai-member-self-service";

export function registerPortalFormRoutes(app: Express) {
  app.get("/api/portal/forms", requireAuth, memberAiSchemaReadyMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allForms = await storage.getForms();
      const userResponses = await storage.getUserFormResponses(userId);
      const liabilityWaiver = isMemberAiSelfServiceEnabled()
        ? allForms.find((form) => form.slug === "liability-waiver")
        : undefined;
      const currentWaiverAcceptance = liabilityWaiver
        ? await storage.getCurrentWaiverAcceptance(userId, liabilityWaiver)
        : undefined;
      const formsWithStatus = allForms.map(form => {
        const response = userResponses.find(r => r.formId === form.id);
        const requiresCurrentAcceptance = isMemberAiSelfServiceEnabled()
          && form.slug === "liability-waiver";
        return {
          ...form,
          responseStatus: requiresCurrentAcceptance && !currentWaiverAcceptance
            ? "needs_current_acceptance"
            : response?.status || "not_started",
          responseId: response?.id,
          currentAcceptanceRequired: requiresCurrentAcceptance,
          currentAcceptanceAccepted: requiresCurrentAcceptance ? Boolean(currentWaiverAcceptance) : undefined,
        };
      });

      res.json(formsWithStatus);
    } catch {
      res.status(500).json({ message: "Failed to get forms" });
    }
  });

  app.get("/api/portal/forms/:slug", requireAuth, memberAiSchemaReadyMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });

      const response = await storage.getFormResponse(userId, form.id);
      const currentAcceptance = isMemberAiSelfServiceEnabled() && form.slug === "liability-waiver"
        ? await storage.getCurrentWaiverAcceptance(userId, form)
        : undefined;
      res.json({
        form,
        response: response || null,
        currentAcceptance: currentAcceptance
          ? {
              accepted: true,
              acceptedAt: currentAcceptance.acceptedAt,
              signerName: currentAcceptance.signerName,
              termsVersionHash: currentAcceptance.termsVersionHash,
            }
          : isMemberAiSelfServiceEnabled() && form.slug === "liability-waiver"
            ? { accepted: false }
            : undefined,
      });
    } catch {
      res.status(500).json({ message: "Failed to get form" });
    }
  });

  app.post("/api/portal/forms/:slug/save", requireAuth, memberAiSchemaReadyMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });
      const { answers } = req.body;
      const response = await storage.saveFormResponse(userId, form.id, answers, "draft");
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to save form" });
    }
  });

  app.post("/api/portal/forms/:slug/retake", requireAuth, memberAiSchemaReadyMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });
      if (!form.retakeable) return res.status(403).json({ message: "This form cannot be retaken" });
      await storage.deleteFormResponse(userId, form.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to reset form" });
    }
  });

  app.post("/api/portal/forms/:slug/submit", requireAuth, memberAiSchemaReadyMiddleware, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });
      const { answers } = req.body;
      if (isMemberAiSelfServiceEnabled() && form.slug === "liability-waiver") {
        const acceptance = await storage.acceptCurrentWaiver(userId, form.id, answers);
        return res.json({
          status: "submitted",
          currentAcceptance: true,
          acceptedAt: acceptance.acceptedAt,
          signerName: acceptance.signerName,
          termsVersionHash: acceptance.termsVersionHash,
        });
      }
      await storage.saveFormResponse(userId, form.id, answers, "draft");
      const response = await storage.submitFormResponse(userId, form.id);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit form" });
    }
  });
}