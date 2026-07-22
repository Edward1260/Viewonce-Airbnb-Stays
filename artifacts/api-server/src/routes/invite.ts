import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

/**
 * POST /api/validate-invite
 * Ported from pages/api/validate-invite.js.
 * Validates one-time invite tokens — tries Supabase edge function when env vars
 * are set, otherwise falls back to a local JSON file check.
 */
router.post("/validate-invite", async (req, res) => {
  try {
    const { token, action = "check" } = req.body ?? {};
    if (!token) {
      res.status(400).json({ valid: false, reason: "missing_token" });
      return;
    }

    const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    const SUPABASE_ANON_KEY = process.env["SUPABASE_ANON_KEY"] ?? process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const fnUrl = SUPABASE_URL.replace(/\/$/, "") + "/functions/v1/validate-invite-token";
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token, action }),
      });
      if (!r.ok) {
        res.status(502).json({ valid: false, reason: "supabase_function_failed" });
        return;
      }
      const data = await r.json() as Record<string, unknown>;
      res.status(200).json({
        valid: !!(data && (data["valid"] || data["ok"] || data["isValid"] || data["tokenValid"])),
        detail: data,
      });
      return;
    }

    // Local fallback: check one-time invite file
    try {
      const invitePath = path.join(process.cwd(), "data", "one_time_invite.json");
      if (fs.existsSync(invitePath)) {
        const raw = fs.readFileSync(invitePath, "utf8");
        const obj = JSON.parse(raw || "{}") as { token?: string; used?: boolean; usedAt?: string };
        if (obj.token && obj.token === token) {
          if (obj.used) {
            res.status(200).json({ valid: false, reason: "token_already_used" });
            return;
          }
          if (action === "consume") {
            obj.used = true;
            obj.usedAt = new Date().toISOString();
            try {
              fs.writeFileSync(invitePath, JSON.stringify(obj, null, 2), "utf8");
            } catch {
              req.log.error("Failed to write invite file");
            }
            res.status(200).json({ valid: true, reason: "one_time_token_consumed" });
            return;
          }
          res.status(200).json({ valid: true, reason: "one_time_token_valid" });
          return;
        }
      }
    } catch (e) {
      req.log.error({ err: e }, "one-time invite check failed");
    }

    // Fail closed: no Supabase configured and no matching local invite file.
    // We do not accept arbitrary tokens by length or prefix — that would bypass
    // the one-time invite flow for privileged platform-master-hub signup paths.
    res.status(200).json({ valid: false, reason: "no_upstream_available" });
  } catch (e) {
    req.log.error({ err: e }, "validate-invite error");
    res.status(500).json({ valid: false, error: (e as Error).message });
  }
});

export default router;
