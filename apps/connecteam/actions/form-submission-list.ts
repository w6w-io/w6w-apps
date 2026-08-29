import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient, toIdList } from "../lib/client.ts";
import { formIdParam, paginationParams } from "../lib/params.ts";

/** `GET /forms/v1/forms/{formId}/form-submissions` — one form's submissions. */
interface Input {
  formId: number;
  userIds?: string;
  submittingStartTimestamp?: number;
  submittingEndTime?: number;
  limit?: number;
  offset?: number;
}

const formSubmissionList: ActionDefinition<Input> = {
  key: "form-submission-list",
  type: "search",
  resource: "form-submission",
  title: "List Form Submissions",
  description: "List submissions for one form.",
  params: [
    formIdParam,
    {
      key: "userIds",
      label: "Submitting user IDs",
      type: "string",
      hint: "Comma-separated numeric ids.",
    },
    {
      key: "submittingStartTimestamp",
      label: "Submitted after (Unix seconds)",
      type: "number",
    },
    {
      key: "submittingEndTime",
      label: "Submitted before (Unix seconds)",
      type: "number",
    },
    ...paginationParams(100),
  ],
  output: [
    { key: "formSubmissions", type: "array", label: "Form submissions" },
    { key: "offset", type: "number", label: "Offset of this page" },
    { key: "total", type: "number", label: "Total matching submissions (when computed)" },
  ],

  async execute(input, ctx) {
    const { data, paging } = await new ConnecteamClient(ctx).page<
      { formSubmissions: unknown[] }
    >(
      `/forms/v1/forms/${input.formId}/form-submissions`,
      {
        query: {
          userIds: toIdList(input.userIds),
          submittingStartTimestamp: input.submittingStartTimestamp,
          submittingEndTime: input.submittingEndTime,
          limit: input.limit,
          offset: input.offset,
        },
      },
    );
    return { formSubmissions: data.formSubmissions ?? [], ...paging };
  },
};

export default formSubmissionList;
