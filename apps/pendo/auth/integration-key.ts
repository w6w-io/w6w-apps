import type { AuthDefinition } from "@w6w/types";
import { DATA_HOSTS, describeError, regionOf, REGIONS } from "../lib/client.ts";

/**
 * Pendo's two keys, which authenticate two different host families.
 *
 * ## The integration key runs `/api/v1/*`; the track secret runs `/data/track`
 *
 * Both are sent as the SAME header, `x-pendo-integration-key`, which is what
 * makes them easy to mix up — the header name gives no hint that the value
 * has to come from a different settings screen depending on which host it is
 * going to. Pendo's own docs call this out on the Track Event endpoint:
 * "Your Pendo_trackEventSecret_Key is different from your
 * x-pendo-integration-key or your Pendo Subscription API Key".
 *
 * The `sign` hook picks the right one by host, so no action ever has to know
 * which secret a request needs.
 *
 * ## The region decides which five hosts
 *
 * A Pendo subscription lives in exactly one of five regions (US, EU, US1,
 * JPN, AU), each with its own API host and data host. A key from one
 * region's subscription is simply invalid against another region's host —
 * `test` says so when it fails, because this is the single most common way a
 * perfectly good key looks broken.
 */
const auth: AuthDefinition = {
  key: "integration-key",
  type: "custom",
  displayName: "Integration Key",
  description:
    "Pendo's Integration Key (Settings → Integrations) reads and — with write access — writes " +
    "everything under /api/v1. Sending a Track Event needs a SEPARATE Track Event Shared " +
    "Secret from a different settings page; without it, event-track fails even though the " +
    "integration key above is perfectly valid.",
  connectionLabel: "Pendo ({{region}})",
  fields: [
    {
      key: "integrationKey",
      label: "Integration Key",
      type: "secret",
      required: true,
      hint: "Settings → Integrations → Integration Keys → Add Integration Key. Tick " +
        '"Allow Write Access" if this connection will also set metadata, reset guides, or ' +
        "file a bulk deletion — read-only keys can only be used for read actions.",
    },
    {
      key: "trackEventSecretKey",
      label: "Track Event Shared Secret",
      type: "secret",
      hint: "Only needed for the Track Event action. A DIFFERENT secret from the integration " +
        'key above — Subscription Settings → your app → App Details → "Track Event Shared ' +
        'Secret". Leaving this unset means Track Event fails even when the integration key ' +
        "is fine.",
    },
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "US",
      options: [
        { value: "US", label: "US — app.pendo.io" },
        { value: "EU", label: "EU — app.eu.pendo.io" },
        { value: "US1", label: "US1 — us1.app.pendo.io" },
        { value: "JPN", label: "JPN — app.jpn.pendo.io" },
        { value: "AU", label: "AU — app.au.pendo.io" },
      ],
      hint: "The region your Pendo subscription is hosted in — the same one you log into the " +
        "Pendo app on. A key from another region's subscription fails against this host exactly " +
        "as a wrong key would.",
    },
  ],

  /** Picks the integration key or the track secret by host. This is the only hook that sees either. */
  sign({ request, credential }) {
    const { integrationKey, trackEventSecretKey } = credential as {
      integrationKey: string;
      trackEventSecretKey?: string;
    };
    const host = new URL(request.url).hostname;
    const key = DATA_HOSTS.has(host) ? (trackEventSecretKey || integrationKey) : integrationKey;
    request.headers["x-pendo-integration-key"] = key;
    return request;
  },

  /**
   * `GET /api/v1/token/verify` — a dedicated, no-scope ping Pendo publishes
   * for exactly this purpose, and the narrowest credential (a read-only
   * integration key) can still reach it.
   *
   * Verified live 2026-09-01: a bad or missing key answers `403` with an
   * EMPTY body — no `{"valid":false}`, nothing to read. Only a genuinely
   * valid key gets the documented `{"valid":true,"writeAccess":true}` JSON,
   * so success is classified from those two booleans rather than the status
   * code alone, and failure — where Pendo gives nothing else to go on —
   * falls back to the status.
   */
  async test({ credential }, ctx) {
    const { integrationKey, region } = credential as { integrationKey?: string; region?: string };
    if (!integrationKey) return { ok: false, message: "credential missing the integration key" };

    const host = REGIONS[regionOf(region)].api;
    let res: Response;
    try {
      res = await ctx.fetch(`https://${host}/api/v1/token/verify`, {
        headers: { "x-pendo-integration-key": integrationKey, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${host}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      return {
        ok: false,
        message: `${describeError(res.status, text)}. If the key is definitely right, double ` +
          "check the region — a key from another region's subscription fails identically",
      };
    }

    let body: { valid?: boolean; writeAccess?: boolean } | null = null;
    try {
      body = JSON.parse(text) as { valid?: boolean; writeAccess?: boolean };
    } catch {
      return { ok: false, message: "Pendo did not return JSON from /token/verify" };
    }
    if (!body?.valid) {
      return { ok: false, message: "Pendo reports this integration key as not valid" };
    }

    return {
      ok: true,
      message: `connected to the ${regionOf(region)} region — ${
        body.writeAccess ? "read-write" : "read-only"
      } key`,
    };
  },

  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: regionOf(region) };
  },
};

export default auth;
