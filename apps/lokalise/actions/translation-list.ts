import type { ActionDefinition } from "@w6w/types";
import { boolFlag, encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/translations` — every translation item in the
 * project, ungrouped (one row per key × language, not nested under its key).
 */
interface Input {
  projectId: string;
  filterLangId?: number;
  filterIsReviewed?: boolean;
  filterUnverified?: boolean;
  filterUntranslated?: boolean;
  filterActiveTaskId?: number;
  limit?: number;
  page?: number;
  cursor?: string;
}

const translationList: ActionDefinition<Input> = {
  key: "translation-list",
  type: "search",
  resource: "translation",
  title: "List Translations",
  description: "List all translation items in a project, one row per key/language pair.",
  params: [
    projectIdParam,
    { key: "filterLangId", label: "Language ID", type: "number" },
    { key: "filterIsReviewed", label: "Reviewed only", type: "boolean" },
    { key: "filterUnverified", label: "Unverified only", type: "boolean" },
    { key: "filterUntranslated", label: "Untranslated only", type: "boolean" },
    { key: "filterActiveTaskId", label: "Active task ID", type: "number" },
    ...paginationParams(100),
  ],
  output: [
    { key: "items", type: "array", label: "Translations" },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching translations (offset pagination only)",
    },
    { key: "nextCursor", type: "string", label: "Cursor for the next page, when more remain" },
  ],

  async execute(input, ctx) {
    const { items, totalCount, nextCursor } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/translations`,
      "translations",
      {
        query: {
          filter_lang_id: input.filterLangId,
          filter_is_reviewed: boolFlag(input.filterIsReviewed),
          filter_unverified: boolFlag(input.filterUnverified),
          filter_untranslated: boolFlag(input.filterUntranslated),
          filter_active_task_id: input.filterActiveTaskId,
          ...paginationQuery(input),
        },
      },
    );
    return { items, totalCount, nextCursor };
  },
};

export default translationList;
