import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `GET /forms/{form_id}` — a form's full definition, including its
 * `questions` array with each step's media, logic actions and settings.
 */
interface Input {
  formId: string;
  organizationId?: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch one form's full definition, including its questions (steps).",
  params: [formIdParam, organizationIdParam],
  output: [{ key: "result", type: "object", label: "The form" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(`/forms/${encodeId(input.formId)}`, {
      organizationId: input.organizationId,
    });
    return { result };
  },
};

export default formGet;
