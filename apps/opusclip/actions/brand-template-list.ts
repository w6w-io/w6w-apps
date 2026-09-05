import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `GET /api/brand-templates?q=mine` — list the caller's own brand templates.
 *
 * `q` is a required query parameter, but `mine` is documented as the only
 * legal value, so it is hard-coded rather than exposed as a param a caller
 * could get wrong.
 */
interface BrandTemplate {
  templateId: string;
  name: string;
  isDefault: boolean;
  preferences: Record<string, unknown>;
  type?: string;
}

const brandTemplateList: ActionDefinition<Record<string, never>> = {
  key: "brand-template-list",
  type: "read",
  resource: "brand-template",
  title: "List Brand Templates",
  description: "List your account's brand templates. Use a templateId as clip-project-create's " +
    "brandTemplateId to apply one, or use one of OpusClip's preset ids (see the README).",
  params: [],
  output: [{ key: "items", type: "array", label: "Brand templates" }],

  async execute(_input, ctx) {
    const items = await new OpusClipClient(ctx).json<BrandTemplate[]>("/api/brand-templates", {
      query: { q: "mine" },
    });
    return { items: items ?? [] };
  },
};

export default brandTemplateList;
