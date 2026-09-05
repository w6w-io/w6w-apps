import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient, toNumberList } from "../lib/client.ts";
import { offerStatusOptions, pageParams } from "../lib/params.ts";

/**
 * `GET /c/{company_id}/offers` — verified against the `List offers` resource.
 * Recruitee documents many more filters (`location_ids`, `recruiter_ids`,
 * `lang_codes`, `categories`, `educations`, `priorities`, `employment_types`,
 * …) than are exposed here; `statuses`, `department_ids` and `tag_ids` were
 * picked as the filters most workflows actually need, matching how
 * `packages/apps/apps/apify` narrows a vendor's much larger query surface
 * rather than exposing every documented filter.
 */
interface Input {
  statuses?: string[];
  departmentIds?: number[] | string;
  tagIds?: number[] | string;
  page?: number;
  limit?: number;
}

const offerList: ActionDefinition<Input> = {
  key: "offer-list",
  type: "search",
  resource: "offer",
  title: "List Job Offers",
  description: "List job offers, optionally filtered by status, department or tag.",
  params: [
    {
      key: "statuses",
      label: "Statuses",
      type: "array",
      item: { type: "string" },
      options: offerStatusOptions,
      hint: "Leave empty to list every offer.",
    },
    {
      key: "departmentIds",
      label: "Department IDs",
      type: "array",
      item: { type: "number" },
    },
    { key: "tagIds", label: "Tag IDs", type: "array", item: { type: "number" } },
    ...pageParams(),
  ],
  output: [{ key: "offers", type: "array", label: "Job offers" }],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request("/offers", {
      query: {
        statuses: input.statuses?.join(","),
        department_ids: toNumberList(input.departmentIds)?.join(","),
        tag_ids: toNumberList(input.tagIds)?.join(","),
        page: input.page,
        limit: input.limit,
      },
    });
  },
};

export default offerList;
