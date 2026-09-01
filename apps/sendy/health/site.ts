/**
 * Is this connection's Sendy installation reachable?
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — there is no vendor platform to be up or down;
 *     the operator's own server IS the dependency (see `service`).
 *   - `scope: "connection"` — every Connection points at a different
 *     installation.
 *   - `credential: "context"` — the Connection supplies the installation
 *     URL, and this probe needs no API key to interpret. `sign` must not
 *     run, so an expired key never makes a healthy install look down.
 *   - No `network.allow`: the installation host is already reachable under
 *     the app's own `"*"` allowlist, and a `context` check is unsigned
 *     regardless.
 *
 * The probe is `POST /api/brands/get-brands.php` with **no** `api_key` at
 * all. Sendy documents the exact response for that case — `"API key not
 * passed"` — so seeing that literal string back is proof a live Sendy
 * install evaluated the request, the same "a defined rejection proves
 * liveness" reasoning this pack's `jenkins` app uses for its own `site`
 * check. Only a transport failure, a non-2xx status, or a body that is
 * neither that literal nor JSON (i.e. does not look like Sendy at all)
 * counts as the installation itself being the problem — a different
 * failure from a bad or missing credential, which the derived `auth:api-key`
 * check exists to catch on its own.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrlFromConnection, GET_BRANDS_PATH } from "../lib/client.ts";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Installation reachable",
  description: "Unauthenticated POST to /api/brands/get-brands.php against this connection's own " +
    "installation. Sends no api_key — an expired or wrong key must not make a live " +
    "installation look down.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${GET_BRANDS_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "",
      });
    } catch (err) {
      return { state: "down", message: `installation unreachable: ${String(err)}` };
    }

    if (!res.ok) {
      return { state: "down", message: `${GET_BRANDS_PATH} returned ${res.status}` };
    }

    const text = (await res.text().catch(() => "")).trim();
    if (text === "API key not passed") {
      // The exact documented rejection for a keyless call — a live Sendy
      // install evaluated and rejected this request.
      return { state: "ok", ttlSeconds: 120 };
    }
    return {
      state: "down",
      message:
        `${base} does not look like a Sendy installation — expected "API key not passed", got: ` +
        text.slice(0, 200),
    };
  },
};

export default site;
