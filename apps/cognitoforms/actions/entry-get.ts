import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  entryId: string;
}

/** GET /forms/{formId}/entries/{entryId} — a single entry, with its full field data. Requires `Entry:Read`. */
const entryGet: ActionDefinition<Input> = {
  key: "entry-get",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Retrieve a single entry's field data.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "From a webhook payload, an import result, or another system that recorded it at " +
        'submission time — the API has no "list entries" endpoint.',
    },
  ],
  output: [
    { key: "entry", type: "object", label: "Entry" },
  ],

  async execute(input, ctx) {
    const entry = await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries/${encodeURIComponent(input.entryId)}`,
    );
    return { entry };
  },
};

export default entryGet;
