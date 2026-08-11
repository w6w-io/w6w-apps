import type { ActionDefinition } from "@w6w/types";
import { unwrap, WufooClient } from "../lib/client.ts";

/**
 * `GET /forms/{identifier}/fields.json` — a form's fields.
 *
 * This is the action to run before Create Entry. A submission is keyed by field
 * **ID** (`Field105`), not by label, and this is the only place those ids are
 * published — along with `IsRequired`, the field `Type`, and the `Choices` for a
 * select or radio field.
 *
 * `system: true` adds Wufoo's own metadata fields (entry id, date created, IP,
 * last page accessed) to the list. They are readable but not submittable, which
 * is why it is off by default: including them in a Create Entry payload is a
 * validation error.
 */
interface Input {
  identifier: string;
  system?: boolean;
}

const formFields: ActionDefinition<Input> = {
  key: "form-fields",
  type: "search",
  resource: "field",
  title: "List Form Fields",
  description:
    "List a form's fields — their `ID` (`Field105`), type, whether they are required, and any " +
    "choices. Read this before submitting an entry.",
  params: [
    {
      key: "identifier",
      label: "Form hash or title",
      type: "string",
      required: true,
      placeholder: "s1afea8b1vk0jf7",
    },
    {
      key: "system",
      label: "Include system fields",
      type: "boolean",
      hint:
        "Adds Wufoo's own metadata fields (entry id, date created, IP). They are readable but " +
        "cannot be submitted.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Fields — `ID` is the key a submission uses" }],

  async execute(input, ctx) {
    const body = await new WufooClient(ctx).request(
      `/forms/${encodeURIComponent(input.identifier)}/fields.json`,
      { query: { system: input.system } },
    );
    return unwrap(body, "Fields");
  },
};

export default formFields;
