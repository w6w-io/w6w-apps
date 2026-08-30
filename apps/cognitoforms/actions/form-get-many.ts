import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface FormRef {
  Id: string;
  Name: string;
  InternalName?: string;
}

/**
 * GET /forms — every form in the organization this token can see. Archived forms are excluded by
 * the vendor. Requires `Form:Read`.
 */
const formGetMany: ActionDefinition<Record<string, never>> = {
  key: "form-get-many",
  type: "search",
  resource: "form",
  title: "Get Many Forms",
  description: "List the forms in your organization that this API key can access.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Forms" },
  ],

  async execute(_input, ctx) {
    const items = await new CognitoFormsClient(ctx).request<FormRef[]>("/forms");
    return { items: items ?? [] };
  },
};

export default formGetMany;
