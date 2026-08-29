import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";

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
  render_count?: number;
  expires_at?: string | null;
  base_url?: string;
  sample_url?: string;
}

interface Input {
  uid: string;
}

/**
 * `GET /instant_urls/{uid}`. Does not carry `signing_key` — the vendor
 * reference is explicit that the HMAC signing key is "only returned once" at
 * creation (`instant-url-create`); store it there, this endpoint cannot
 * recover it.
 */
const action: ActionDefinition<Input, InstantUrl> = {
  key: "instant-url-get",
  type: "read",
  resource: "instant-url",
  title: "Get Instant URL",
  description: "Get an Instant URL's configuration and render count.",
  params: [
    { key: "uid", label: "Instant URL UID", type: "string", required: true },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "base_url", type: "string", label: "Base URL" },
    { key: "sample_url", type: "string", label: "Sample URL" },
    { key: "render_count", type: "number", label: "Render count" },
  ],

  async execute(input, ctx) {
    const uid = String(input.uid ?? "").trim();
    if (!uid) throw new Error("`uid` is required");
    return await new BannerbearClient(ctx).json<InstantUrl>(
      `/instant_urls/${encodeURIComponent(uid)}`,
    );
  },
};

export default action;
