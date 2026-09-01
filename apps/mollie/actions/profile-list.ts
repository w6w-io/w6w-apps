import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient, type MollieList, unwrapList } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/profiles` — every website profile on the organization. Only
 * meaningful with an Advanced Access Token or OAuth token spanning several
 * profiles; a plain API key is already scoped to one and will simply see
 * that one profile here too.
 */
interface Input {
  from?: string;
  limit?: number;
}

const profileList: ActionDefinition<Input> = {
  key: "profile-list",
  type: "search",
  resource: "profile",
  title: "List Profiles",
  description:
    "List every website profile on the organization. With a plain API key (scoped to one " +
    "profile) this returns just that profile.",
  params: paginationParams(),
  output: [
    { key: "count", type: "number", label: "Number of items in this page" },
    { key: "items", type: "array", label: "Profiles" },
  ],

  async execute(input, ctx) {
    const body = await new MollieClient(ctx).get<MollieList<unknown>>(
      "/profiles",
      compact({ from: input.from, limit: input.limit }),
    );
    return { count: unwrapList(body, "profiles").length, items: unwrapList(body, "profiles") };
  },
};

export default profileList;
