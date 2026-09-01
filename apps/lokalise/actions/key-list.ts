import type { ActionDefinition } from "@w6w/types";
import { boolFlag, encodeId, LokaliseClient, toList } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/keys` — the project's translation keys.
 *
 * The ceiling for `limit` is **500** on this endpoint, not the 5000 seen on
 * Projects and Translations — Lokalise varies the max per endpoint rather
 * than applying one ceiling API-wide, so each list action here states its own.
 */
interface Input {
  projectId: string;
  includeTranslations?: boolean;
  includeComments?: boolean;
  includeScreenshots?: boolean;
  filterKeys?: string;
  filterFilenames?: string;
  filterTags?: string;
  filterPlatforms?: string[];
  filterUntranslated?: boolean;
  limit?: number;
  page?: number;
  cursor?: string;
}

const keyList: ActionDefinition<Input> = {
  key: "key-list",
  type: "search",
  resource: "key",
  title: "List Keys",
  description: "List a project's translation keys.",
  params: [
    projectIdParam,
    { key: "includeTranslations", label: "Include translations", type: "boolean" },
    { key: "includeComments", label: "Include comments", type: "boolean" },
    { key: "includeScreenshots", label: "Include screenshot URLs", type: "boolean" },
    {
      key: "filterKeys",
      label: "Filter by key name",
      type: "string",
      hint: "One or more key names, comma separated.",
    },
    {
      key: "filterFilenames",
      label: "Filter by filename",
      type: "string",
      hint: "One or more filenames, comma separated.",
    },
    { key: "filterTags", label: "Filter by tag", type: "string", hint: "Comma separated." },
    {
      key: "filterPlatforms",
      label: "Filter by platform",
      type: "multiselect",
      options: [
        { value: "ios", label: "iOS" },
        { value: "android", label: "Android" },
        { value: "web", label: "Web" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "filterUntranslated", label: "Untranslated only", type: "boolean" },
    ...paginationParams(100, 500),
  ],
  output: [
    { key: "items", type: "array", label: "Keys" },
    { key: "totalCount", type: "number", label: "Total matching keys (offset pagination only)" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, when more remain" },
  ],

  async execute(input, ctx) {
    const client = new LokaliseClient(ctx);
    const { items, totalCount, nextCursor } = await client.list(
      `/projects/${encodeId(input.projectId)}/keys`,
      "keys",
      {
        query: {
          include_translations: boolFlag(input.includeTranslations),
          include_comments: boolFlag(input.includeComments),
          include_screenshots: boolFlag(input.includeScreenshots),
          filter_keys: input.filterKeys,
          filter_filenames: input.filterFilenames,
          filter_tags: input.filterTags,
          filter_platforms: toList(input.filterPlatforms),
          filter_untranslated: boolFlag(input.filterUntranslated),
          ...paginationQuery(input),
        },
      },
    );
    return { items, totalCount, nextCursor };
  },
};

export default keyList;
