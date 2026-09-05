import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { contactFieldParams, toCustomFields } from "../lib/params.ts";

/**
 * `POST /contact/{identifier}` — `ContactClient.create` in the official SDK.
 * The identifier must be `email:` or `phone:` (never `id:` — you cannot
 * choose a contact's own id). `firstName` is the SDK's one required field.
 *
 * Not idempotent: creating twice against an identifier that already exists is
 * documented by the SDK as a distinct operation from `create_or_update` — see
 * `contact-create-or-update` for the upsert-safe alternative.
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

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact. Prefer Create Or Update Contact for a safe-to-retry upsert.",
  idempotent: false,
  params: [
    {
      key: "identifier",
      label: "Contact identifier",
      type: "string",
      required: true,
      hint: 'Must be "email:user@example.com" or "phone:+60123456789" — you cannot choose the ' +
        "contact's own id.",
    },
    ...contactFieldParams(true),
  ],
  output: [
    { key: "code", type: "string", label: "Result code" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    if (identifier.startsWith("id:")) {
      throw new Error('Create needs an "email:" or "phone:" identifier, not "id:"');
    }
    return new RespondioClient(ctx).post(
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

export default contactCreate;
