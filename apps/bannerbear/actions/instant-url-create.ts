import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, compact } from "../lib/client.ts";
import { scaleParam } from "../lib/params.ts";

interface InstantUrl {
  uid: string;
  name: string;
  template: string;
  mode?: string;
  security?: string;
  status?: string;
  scale?: number;
  rate_limit?: boolean;
  max_renders?: number | null;
  expires_at?: string | null;
  base_url?: string;
  sample_url?: string;
  /** Only present in THIS response — never returned again by any GET. */
  signing_key?: string;
}

interface Input {
  name: string;
  template: string;
  mode?: string;
  security?: string;
  status?: string;
  scale?: number;
  rateLimit?: boolean;
  templateVersion?: number;
  maxRenders?: number;
  expiresAt?: string;
}

/**
 * `POST /instant_urls` — a URL that renders an image on GET with no API call:
 * build the URL yourself (encoded params or named params, per `mode`) and
 * hand it straight to an `<img>` tag or share it directly.
 *
 * **`signing_key` is returned ONLY in this response.** Set `security: "signed"`
 * for anything production-facing — the vendor's own guidance — and the
 * workflow that creates this Instant URL is the only place that will ever see
 * the key; no `instant-url-get` call recovers it afterwards.
 */
const action: ActionDefinition<Input, InstantUrl> = {
  key: "instant-url-create",
  type: "perform",
  resource: "instant-url",
  title: "Create Instant URL",
  description:
    "Create a self-service render URL bound to a template. Not idempotent — every call creates " +
    "a new URL, and its signing_key (when security is signed) is returned ONLY here.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "template", label: "Template UID", type: "string", required: true },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "encoded", label: "Encoded — one base64 modifications param" },
        { value: "named_params", label: "Named params — one query param per layer" },
      ],
    },
    {
      key: "security",
      label: "Security",
      type: "select",
      options: [
        { value: "signed", label: "Signed — HMAC-validated, recommended for production" },
        { value: "open", label: "Open — anyone with the URL can render" },
      ],
      hint: "Use signed for production. The HMAC signing_key needed to sign requests is " +
        "returned only in this action's response.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "disabled", label: "Disabled" },
      ],
    },
    scaleParam,
    {
      key: "rateLimit",
      label: "Per-IP rate limiting",
      type: "boolean",
      hint: "Enable per-IP rate limiting on this URL.",
    },
    {
      key: "templateVersion",
      label: "Pin template version",
      type: "number",
      validation: { integer: true },
      hint: "Leave empty to always render the template's current (latest) version.",
    },
    {
      key: "maxRenders",
      label: "Max renders",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Leave empty for unlimited.",
    },
    {
      key: "expiresAt",
      label: "Expires at",
      type: "datetime",
      hint: "ISO 8601 timestamp after which this URL stops rendering. Leave empty for no expiry.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "base_url", type: "string", label: "Base URL" },
    { key: "sample_url", type: "string", label: "Sample URL" },
    { key: "signing_key", type: "string", label: "HMAC signing key (returned once)" },
  ],

  async execute(input, ctx) {
    const name = String(input.name ?? "").trim();
    const template = String(input.template ?? "").trim();
    if (!name) throw new Error("`name` is required");
    if (!template) throw new Error("`template` is required");

    return await new BannerbearClient(ctx).json<InstantUrl>("/instant_urls", {
      method: "POST",
      body: compact({
        name,
        template,
        mode: input.mode,
        security: input.security,
        status: input.status,
        scale: input.scale,
        rate_limit: input.rateLimit,
        template_version: input.templateVersion,
        max_renders: input.maxRenders,
        expires_at: input.expiresAt,
      }),
    });
  },
};

export default action;
