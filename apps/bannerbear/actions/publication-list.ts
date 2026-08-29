import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Publication {
  uid: string;
  name: string;
  description?: string | null;
  tags?: string[];
  visibility?: "unpublished" | "published" | "public_library";
  preview?: string | null;
  install_count?: number;
  template_kind?: "image";
}

interface Input {
  page?: number;
}

/**
 * `GET /publications` — public template-library listings, visible to any
 * authenticated caller; publications this key created with `visibility:
 * published` (not yet in the public library) are only returned to that same
 * key.
 */
const action: ActionDefinition<Input, Publication[]> = {
  key: "publication-list",
  type: "read",
  resource: "publication",
  title: "List Publications",
  description: "List public template-library publications.",
  params: [pageParam],
  output: [{ key: "publications", type: "array", label: "Publications" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<Publication[]>("/publications", {
      query: { page: input.page },
    });
  },
};

export default action;
