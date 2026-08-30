import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `PATCH /forms/{form_id}` — partial update.
 *
 * The vendor's Postman collection documents SIX different bodies against this
 * one path/verb — plain field updates, "Add contact form" (the
 * `requires_contact_*`/`show_contact_*` flags), "Schedule a close date"
 * (`metadata.schedule_close_date`/`schedule_close_date_message`), "Edit end
 * screen" (`metadata.goodbye_screen_*`), and more — because VideoAsk models
 * nearly every form setting as one flat or `metadata`-nested PATCH body
 * rather than a dedicated sub-resource. Rather than one action per documented
 * example (which would still not cover the space — `metadata` alone carries
 * dozens of undocumented-here fields like colors, fonts and locale), this
 * exposes the handful of top-level fields every example shares plus a raw
 * `body` passthrough for anything else, merged shallowly with the typed
 * fields taking precedence.
 */
interface Input {
  formId: string;
  title?: string;
  areAnswersPublic?: boolean;
  areMessagesPublic?: boolean;
  hideBranding?: boolean;
  folderId?: string;
  body?: unknown;
  organizationId?: string;
}

const formUpdate: ActionDefinition<Input> = {
  key: "form-update",
  type: "perform",
  resource: "form",
  title: "Update Form",
  description:
    "Partially update a form. Common fields are typed; use Body (JSON) for anything else " +
    "VideoAsk's form schema supports (e.g. metadata.*, requires_contact_*, close-date fields).",
  idempotent: true,
  params: [
    formIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "areAnswersPublic", label: "Answers are public", type: "boolean" },
    { key: "areMessagesPublic", label: "Messages are public", type: "boolean" },
    { key: "hideBranding", label: "Hide VideoAsk branding", type: "boolean" },
    { key: "folderId", label: "Folder ID", type: "string" },
    {
      key: "body",
      label: "Body (JSON)",
      type: "json",
      hint: 'Raw fields merged into the PATCH body, e.g. {"metadata": {"locale": "en-US"}}.',
    },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The updated form" }],

  async execute(input, ctx) {
    const extra = input.body && typeof input.body === "object"
      ? input.body as Record<string, unknown>
      : {};
    const result = await new VideoAskClient(ctx).entity(`/forms/${encodeId(input.formId)}`, {
      method: "PATCH",
      body: {
        ...extra,
        ...compact({
          title: input.title,
          are_answers_public: input.areAnswersPublic,
          are_messages_public: input.areMessagesPublic,
          hide_branding: input.hideBranding,
          folder_id: input.folderId,
        }),
      },
      organizationId: input.organizationId,
    });
    return { result };
  },
};

export default formUpdate;
