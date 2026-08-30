import type { ActionDefinition, Param } from "@w6w/types";
import { flag, UnbounceClient } from "../lib/client.ts";
import { type ListInput, listParams, listQuery } from "../lib/params.ts";

/**
 * `GET /pages` — all pages for the authenticated principal, regardless of
 * sub-account. The reference notes this top-level resource exists specifically
 * for OAuth clients: an Unbounce user can be invited to author or view a page
 * on a *different* client than their own, and the legacy per-account/
 * per-sub-account page lists don't reach those external pages. `role` is this
 * endpoint's own filter for that case.
 */
interface Input extends ListInput {
  withStats?: boolean;
  role?: string;
}

const extraParams: Param[] = [
  {
    key: "withStats",
    label: "Include stats",
    type: "boolean",
    hint: "Include each page's A/B test stats in the collection.",
  },
  {
    key: "role",
    label: "Role",
    type: "select",
    options: [
      { value: "viewer", label: "Viewer" },
      { value: "author", label: "Author" },
    ],
    hint: "Restricts the scope of the returned pages to this principal's role on them.",
  },
];

const pageList: ActionDefinition<Input> = {
  key: "page-list",
  type: "search",
  resource: "page",
  title: "List Pages",
  description:
    "Retrieve all pages for the authenticated principal (API key or OAuth client), including " +
    "pages owned by a different sub-account this principal was invited onto.",
  params: [...listParams(), ...extraParams],
  output: [
    { key: "pages", type: "array", label: "Pages" },
    { key: "metadata", type: "object", label: "Collection metadata" },
  ],

  execute(input, ctx) {
    return new UnbounceClient(ctx).get("/pages", {
      ...listQuery(input),
      with_stats: flag(input.withStats),
      role: input.role,
    });
  },
};

export default pageList;
