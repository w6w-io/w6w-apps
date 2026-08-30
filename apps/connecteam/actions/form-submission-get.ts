import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

/** `GET /forms/v1/forms/{formId}/form-submissions/{formSubmissionId}` — one submission. */
interface Input {
  formId: number;
  formSubmissionId: string;
}

const formSubmissionGet: ActionDefinition<Input> = {
  key: "form-submission-get",
  type: "read",
  resource: "form-submission",
  title: "Get Form Submission",
  description: "Get one form submission by id.",
  params: [
    formIdParam,
    { key: "formSubmissionId", label: "Form Submission ID", type: "string", required: true },
  ],
  output: [
    { key: "formSubmission", type: "object", label: "Form submission" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(
      `/forms/v1/forms/${input.formId}/form-submissions/${input.formSubmissionId}`,
    );
  },
};

export default formSubmissionGet;
