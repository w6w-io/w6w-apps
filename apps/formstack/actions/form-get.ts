import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/** `GET /forms/{formId}` — one form's configuration. */
interface Input {
  formId: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch a single form's details by id.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "From List Forms, or the numeric id in the form's Formstack URL.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Form id" }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request(`/forms/${encodeURIComponent(input.formId)}`);
  },
};

export default formGet;
