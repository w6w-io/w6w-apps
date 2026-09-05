import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { contactFieldParams, toCustomFields } from "../lib/params.ts";

/**
 * `POST /contact/create_or_update/{identifier}` — `ContactClient.createOrUpdate`
 * in the official SDK. The upsert-safe alternative to `contact-create`: safe
 * for a workflow to retry, and the usual choice for "make sure this contact
 * exists with these values" without first checking whether it does.
 */
interface Input {
  identifier: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  language?: string;
  countryCode?: string;
  profilePic?: string;
  customFields?: Array<{ name: string; value?: string }>;
}

const contactCreateOrUpdate: ActionDefinition<Input> = {
  key: "contact-create-or-update",
  type: "perform",
  resource: "contact",
  title: "Create Or Update Contact",
  description: "Create the contact if it doesn't exist yet, or update it if it does.",
  idempotent: true,
  params: [
    {
      key: "identifier",
      label: "Contact identifier",
      type: "string",
      required: true,
      hint: 'One of "id:123", "email:user@example.com", or "phone:+60123456789".',
    },
    ...contactFieldParams(true),
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    return new RespondioClient(ctx).post(
      `/contact/create_or_update/${identifier}`,
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

export default contactCreateOrUpdate;
