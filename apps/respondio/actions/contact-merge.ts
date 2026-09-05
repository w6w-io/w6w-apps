import type { ActionDefinition } from "@w6w/types";
import { compact, RespondioClient } from "../lib/client.ts";
import { contactFieldParams, toCustomFields } from "../lib/params.ts";

/**
 * `POST /contact/merge` — `ContactClient.merge` in the official SDK.
 * `MergeContactsRequest` = `{contactIds: [number, number]} & Partial<ContactFields>`
 * — the two numeric contact ids to merge, plus optional field values to apply
 * to the surviving contact in the same call.
 *
 * Not idempotent: after the first call one of the two contacts no longer
 * exists, so a retry with the same pair fails rather than repeating safely.
 */
interface Input {
  contactIdA: number;
  contactIdB: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  language?: string;
  countryCode?: string;
  profilePic?: string;
  customFields?: Array<{ name: string; value?: string }>;
}

const contactMerge: ActionDefinition<Input> = {
  key: "contact-merge",
  type: "perform",
  resource: "contact",
  title: "Merge Contacts",
  description: "Merge two contacts into one, optionally setting field values on the survivor.",
  idempotent: false,
  params: [
    { key: "contactIdA", label: "Contact ID (kept)", type: "number", required: true },
    { key: "contactIdB", label: "Contact ID (merged away)", type: "number", required: true },
    ...contactFieldParams(false),
  ],
  output: [{ key: "contactId", type: "number", label: "Contact ID" }],

  execute(input, ctx) {
    if (!Number.isFinite(input.contactIdA) || !Number.isFinite(input.contactIdB)) {
      throw new Error("Both contact ids are required");
    }
    if (input.contactIdA === input.contactIdB) {
      throw new Error("Contact ID (kept) and Contact ID (merged away) must be different");
    }
    return new RespondioClient(ctx).post(
      "/contact/merge",
      compact({
        contactIds: [input.contactIdA, input.contactIdB],
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

export default contactMerge;
