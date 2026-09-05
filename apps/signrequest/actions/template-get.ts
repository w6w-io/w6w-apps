import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";

interface Input {
  templateId: string;
}

/** `GET /templates/{uuid}/` — a template's configuration, including its per-signer field config. */
const templateGet: ActionDefinition<Input> = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get Template",
  description: "Retrieve a template's configuration.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      hint: "The template uuid (from List Templates).",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Template ID" },
    { key: "url", type: "string", label: "Template resource URL" },
    { key: "name", type: "string", label: "Name" },
    { key: "who", type: "string", label: "`m`: only me, `mo`: me and others, `o`: only others" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/templates/${encodeURIComponent(input.templateId)}/`,
    );
  },
};

export default templateGet;
