import type { ActionDefinition } from "@w6w/types";
import { unwrap, WufooClient } from "../lib/client.ts";

/**
 * `GET /forms/{identifier}.json` — one form.
 *
 * The identifier may be the form's **hash** or its **title**, which the vendor
 * documents interchangeably. The hash is the stable one: retitling a form
 * changes the title identifier and silently breaks a workflow keyed on it.
 *
 * Wufoo returns the single form still wrapped in the `Forms` array, so this
 * unwraps to that array's first element — returning a one-element array from an
 * action called "Get Form" would be a small lie the next step has to undo.
 */
interface Input {
  identifier: string;
}

const formGet: ActionDefinition<Input> = {
  key: "form-get",
  type: "read",
  resource: "form",
  title: "Get Form",
  description: "Fetch a single form by its hash (or title).",
  params: [
    {
      key: "identifier",
      label: "Form hash or title",
      type: "string",
      required: true,
      placeholder: "s1afea8b1vk0jf7",
      hint: "Prefer the hash from List Forms. A title also works, but renaming the form breaks a " +
        "workflow that uses it.",
    },
  ],
  output: [{ key: "Hash", type: "string", label: "The form's hash" }],

  async execute(input, ctx) {
    const body = await new WufooClient(ctx).request(
      `/forms/${encodeURIComponent(input.identifier)}.json`,
    );
    const forms = unwrap<Array<Record<string, unknown>>>(body, "Forms");
    // Wufoo wraps even a single form in the collection envelope.
    return Array.isArray(forms) ? forms[0] : forms;
  },
};

export default formGet;
