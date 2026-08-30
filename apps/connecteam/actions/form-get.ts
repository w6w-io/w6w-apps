import type { ActionDefinition } from "@w6w/types";
import { ConnecteamClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

/** `GET /forms/v1/forms/{formId}` — one form's definition, including its questions. */
interface Input {
  formId: number;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Get one form's definition.",
  params: [formIdParam],
  output: [
    { key: "formId", type: "number", label: "Form ID" },
    { key: "formName", type: "string", label: "Form name" },
    { key: "questions", type: "array", label: "Questions" },
    { key: "settings", type: "object", label: "Settings" },
  ],

  execute(input, ctx) {
    return new ConnecteamClient(ctx).data(`/forms/v1/forms/${input.formId}`);
  },
};

export default formGet;
