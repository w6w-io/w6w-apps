import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { contactFieldParams, toCustomFields } from "../lib/params.ts";

/**
 * `PUT /contact/{identifier}` — `ContactClient.update` in the official SDK.
 * Every field is optional (`Partial<ContactFields>`); only the ones supplied
 * are changed. PUT semantics make a retry safe.
 */
interface Input {
  identifier: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  language?: string;
  countryCode?: string;
  profilePic?: string;
  customFields?: Array<{ name: string; value?: string }>;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update one or more fields on an existing contact.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    ...contactFieldParams(false),
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).put(
      `/contact/${identifier}`,
      compact({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        email: input.email,
        language: input.language,
        countryCode: input.countryCode,
        profilePic: input.profilePic,
        custom_fields: toCustomFields(input.customFields),
      }),
    );
  },
};

export default contactUpdate;
