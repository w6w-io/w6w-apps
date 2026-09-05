import type { ActionDefinition } from "@w6w/types";
import { ZohoRecruitClient } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";
import type { RecruitListInput, RecruitListResponse } from "../lib/recruit.ts";

interface Input {
  page?: number;
  per_page?: number;
}

/**
 * `GET /Notes` — documented admin-only: "The system throws an error when
 * non-admin users try to fetch the records from the Notes module." A
 * non-admin connection can still create/update/delete notes; only this
 * action is affected.
 */
const noteList: ActionDefinition<Input, RecruitListResponse> = {
  key: "note-list",
  type: "read",
  resource: "note",
  title: "List Notes",
  description:
    "List records in the Notes module, across every module they're attached to. Zoho restricts this endpoint to admin users.",
  params: pageParams,
  output: [
    { key: "data", type: "array", label: "Notes" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return new ZohoRecruitClient(ctx).request<RecruitListResponse>("/Notes", {
      query: { page: input.page, per_page: input.per_page } satisfies Pick<
        RecruitListInput,
        "page" | "per_page"
      >,
    });
  },
};

export default noteList;
