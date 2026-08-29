import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, compact } from "../lib/client.ts";
import { scaleParam } from "../lib/params.ts";

interface InstantUrl {
  uid: string;
  name: string;
  template: string;
  status?: string;
}

interface Input {
  uid: string;
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
 * `PATCH /instant_urls/{uid}`. `name` and `template` are documented as
 * required even on this partial-looking update — same replace-not-merge
 * behavior as `webhook-update`.
 */
const action: ActionDefinition<Input, InstantUrl> = {
  key: "instant-url-update",
  type: "perform",
  resource: "instant-url",
  title: "Update Instant URL",
  description:
    "Update an Instant URL's binding, mode, security, status, scale, rate limiting, version " +
    "pin, render cap, or expiry. name and template are required even when unchanged.",
  idempotent: true,
  params: [
    { key: "uid", label: "Instant URL UID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "template", label: "Template UID", type: "string", required: true },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "encoded", label: "Encoded" },
        { value: "named_params", label: "Named params" },
      ],
    },
    {
      key: "security",
      label: "Security",
      type: "select",
      options: [
        { value: "signed", label: "Signed" },
        { value: "open", label: "Open" },
      ],
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
    { key: "rateLimit", label: "Per-IP rate limiting", type: "boolean" },
    {
      key: "templateVersion",
      label: "Pin template version",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "maxRenders",
      label: "Max renders",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    { key: "expiresAt", label: "Expires at", type: "datetime" },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    const name = String(input.name ?? "").trim();
    const template = String(input.template ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    if (!name) throw new Error("`name` is required");
    if (!template) throw new Error("`template` is required");

    return await new BannerbearClient(ctx).json<InstantUrl>(
      `/instant_urls/${encodeURIComponent(uid)}`,
      {
        method: "PATCH",
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
      },
    );
  },
};

export default action;
