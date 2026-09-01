import type { ActionDefinition } from "@w6w/types";
import { LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /system/languages` — every language Lokalise knows about, with its
 * `lang_iso`, `lang_name` and plural forms. Not project-scoped: this is the
 * catalog `language-create`'s `lang_iso` values are drawn from.
 */
interface Input {
  limit?: number;
  page?: number;
}

const languageListSystem: ActionDefinition<Input> = {
  key: "language-list-system",
  type: "search",
  resource: "language",
  title: "List System Languages",
  description: "List every language Lokalise supports, independent of any project.",
  params: paginationParams(200).filter((p) => p.key !== "cursor"),
  output: [
    { key: "items", type: "array", label: "Languages" },
    { key: "totalCount", type: "number", label: "Total system languages" },
  ],

  async execute(input, ctx) {
    // No cursor pagination on this endpoint — only limit/page.
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      "/system/languages",
      "languages",
      { query: paginationQuery(input) },
    );
    return { items, totalCount };
  },
};

export default languageListSystem;
