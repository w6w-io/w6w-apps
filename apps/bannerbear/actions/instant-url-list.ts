import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface InstantUrl {
  uid: string;
  name: string;
  template: string;
  template_version?: number | null;
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
  created_at?: string;
}

interface Input {
  page?: number;
}

/**
 * `GET /instant_urls` — self-service render URLs bound to a template. Unlike
 * `GET /instant_urls/{uid}`'s creation-time response, this list never carries
 * `signing_key` — the HMAC key is returned exactly once, at creation.
 */
const action: ActionDefinition<Input, InstantUrl[]> = {
  key: "instant-url-list",
  type: "read",
  resource: "instant-url",
  title: "List Instant URLs",
  description: "List Instant URLs in the workspace.",
  params: [pageParam],
  output: [{ key: "instantUrls", type: "array", label: "Instant URLs" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<InstantUrl[]>("/instant_urls", {
      query: { page: input.page },
    });
  },
};

export default action;
