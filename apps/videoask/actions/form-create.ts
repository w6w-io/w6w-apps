import type { ActionDefinition } from "@w6w/types";
import { compact, VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `POST /forms` — create a new, empty form (videoask).
 *
 * Body fields are exactly the vendor's own worked example:
 * `title`, `show_contact_name`, `show_contact_email`,
 * `show_contact_phone_number`, `show_consent`, `requires_contact_name`,
 * `requires_contact_email`, `requires_contact_phone_number`,
 * `requires_consent`. `folder_id` is additionally accepted — it appears on
 * every returned form entity and is documented as a body field on Duplicate
 * and Restore, so it is reasonable to expect Create honours it too, though
 * the vendor's own Create example does not exercise it.
 *
 * A fresh form has no questions; add them with Create Question.
 */
interface Input {
  title: string;
  folderId?: string;
  showContactName?: boolean;
  showContactEmail?: boolean;
  showContactPhoneNumber?: boolean;
  showConsent?: boolean;
  requiresContactName?: boolean;
  requiresContactEmail?: boolean;
  requiresContactPhoneNumber?: boolean;
  requiresConsent?: boolean;
  organizationId?: string;
}

const formCreate: ActionDefinition<Input> = {
  key: "form-create",
  type: "perform",
  resource: "form",
  title: "Create Form",
  description: "Create a new, empty form (videoask).",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Unconfirmed on Create; see doc.",
    },
    { key: "showContactName", label: "Show contact name field", type: "boolean" },
    { key: "showContactEmail", label: "Show contact email field", type: "boolean" },
    { key: "showContactPhoneNumber", label: "Show contact phone field", type: "boolean" },
    { key: "showConsent", label: "Show consent checkbox", type: "boolean" },
    { key: "requiresContactName", label: "Require contact name", type: "boolean" },
    { key: "requiresContactEmail", label: "Require contact email", type: "boolean" },
    { key: "requiresContactPhoneNumber", label: "Require contact phone", type: "boolean" },
    { key: "requiresConsent", label: "Require consent", type: "boolean" },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The created form" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity("/forms", {
      method: "POST",
      body: compact({
        title: input.title,
        folder_id: input.folderId,
        show_contact_name: input.showContactName,
        show_contact_email: input.showContactEmail,
        show_contact_phone_number: input.showContactPhoneNumber,
        show_consent: input.showConsent,
        requires_contact_name: input.requiresContactName,
        requires_contact_email: input.requiresContactEmail,
        requires_contact_phone_number: input.requiresContactPhoneNumber,
        requires_consent: input.requiresConsent,
      }),
      organizationId: input.organizationId,
    });
    return { result };
  },
};

export default formCreate;
