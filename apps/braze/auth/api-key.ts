import type { AuthDefinition } from "@w6w/types";
import {
  apiUrl,
  DEFAULT_INSTANCE,
  type Instance,
  INSTANCES,
  readBrazeError,
} from "../lib/client.ts";

/**
 * Bearer REST API key — the entire authentication story for Braze's REST API.
 * The fetched spec declares exactly one security scheme
 * (`components.securitySchemes.BearerAuth`, `{ type: "http", scheme:
 * "bearer" }`), applied to every operation.
 *
 * ## The instance is part of the credential
 *
 * A REST key is minted per Braze workspace, and a workspace lives on exactly
 * one of the fixed clusters `lib/client.ts` enumerates from the spec's own
 * `servers[]` array. A key from one instance is simply rejected — as an
 * ordinary 401 — by every other instance, and Braze publishes no endpoint
 * that answers "which instance is this key for", so it is asked for rather
 * than guessed. `test` probes the chosen instance, which is what surfaces a
 * mismatch at connect time instead of at the first workflow run.
 *
 * ## The probe: `GET /content_blocks/list?limit=1`
 *
 * There is no whoami/key-info endpoint in the fetched spec (Braze's REST keys
 * carry named, per-endpoint-group permissions rather than a single
 * introspectable identity), so this app follows the same rule the pack's
 * other apps do when no such endpoint exists: probe the cheapest read
 * available. Content Blocks was picked over `/campaigns/list` because it is
 * the one list endpoint in the export/list surface that actually supports a
 * `limit` query parameter, so the probe costs one Content Block worth of
 * data no matter how large the workspace's catalog is, and its response
 * carries nothing sensitive. A REST key that legitimately lacks the
 * `content_blocks.list` permission still authenticates fine for every other
 * endpoint it *is* scoped for — `test` reports that distinctly from a bad
 * key (403 vs 401), exactly as Braze's own error envelope distinguishes them.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "REST API Key",
  description:
    "A REST API key from Braze → Settings → APIs and Identifiers. Sent as `Authorization: Bearer <key>`.",
  connectionLabel: "Braze ({{instance}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "REST API Key",
      type: "secret",
      required: true,
      hint: "Braze dashboard → Settings → APIs and Identifiers → REST API Keys.",
    },
    {
      key: "instance",
      label: "Instance",
      type: "select",
      required: true,
      default: DEFAULT_INSTANCE,
      options: Object.entries(INSTANCES).map(([value, { host, label }]) => ({
        value,
        label: `${label} (${host})`,
      })),
      hint: "Read your workspace's dashboard URL (dashboard-XX.braze.com) to find which cluster " +
        "you're on — a key from one instance does not work against another.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey, instance } = credential as { apiKey?: string; instance?: Instance };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    const resolved = (instance && instance in INSTANCES) ? instance : DEFAULT_INSTANCE;

    const res = await ctx.fetch(`${apiUrl(resolved)}/content_blocks/list?limit=1`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) {
      return {
        ok: false,
        message: `Braze rejected the API key on instance ${resolved} (401): ${await readBrazeError(
          res,
        )}`,
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message:
          `the API key is valid but lacks the content_blocks.list permission (403): ${await readBrazeError(
            res,
          )}`,
      };
    }
    if (!res.ok) {
      return { ok: false, message: `Braze returned ${res.status}: ${await readBrazeError(res)}` };
    }
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { instance } = credential as { instance?: Instance };
    return { instance: (instance && instance in INSTANCES) ? instance : DEFAULT_INSTANCE };
  },
};

export default apiKey;
