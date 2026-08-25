import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { asOptionalJson, toList } from "../lib/params.ts";

interface Input {
  number: string;
  firstName?: string;
  lastName?: string;
  assignedToEmail?: string;
  sendblueNumber?: string;
  tags?: string[] | string;
  customVariables?: unknown;
  updateIfExists?: boolean;
}

/**
 * `POST /api/v2/contacts`. The vendor's schema carries both a `preferred`
 * field name (`first_name`) and a parallel `Deprecated` camelCase alias
 * (`firstName`) for several fields — this app only ever sends the preferred
 * snake_case form.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact, or update it in place when updateIfExists is set.",
  idempotent: false,
  params: [
    { key: "number", label: "Phone number", type: "string", required: true, hint: "E.164." },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "assignedToEmail", label: "Assigned to (email)", type: "string" },
    { key: "sendblueNumber", label: "Sendblue number to send with", type: "string" },
    { key: "tags", label: "Tags", type: "multiselect" },
    {
      key: "customVariables",
      label: "Custom variables (JSON)",
      type: "json",
      hint: '{"Lead Source": "Website"} — keys are human-readable labels; new ones are ' +
        "auto-created.",
    },
    {
      key: "updateIfExists",
      label: "Update if exists",
      type: "boolean",
      default: false,
    },
  ],
  output: [{ key: "contact", type: "object", label: "Contact" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/v2/contacts",
      compact({
        number: input.number,
        first_name: input.firstName,
        last_name: input.lastName,
        assigned_to_email: input.assignedToEmail,
        sendblue_number: input.sendblueNumber,
        tags: toList(input.tags),
        custom_variables: asOptionalJson(input.customVariables, "customVariables"),
        update_if_exists: input.updateIfExists,
      }),
    );
  },
};

export default contactCreate;
