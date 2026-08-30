import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";

interface Input {
  formId: number;
}

interface Output {
  form_id: number;
}

/**
 * `DELETE /tracking/forms/{form_id}` — permanently delete a tracked web form.
 *
 * Verified against `whatconverts.com/api/tracking/` on 2026-08-29, which carries its own
 * notice: "After deleting you will no longer be able to track form submissions for this
 * web form." Not idempotent for the same reason as `account-delete`.
 */
const trackingFormDelete: ActionDefinition<Input, Output> = {
  key: "tracking-form-delete",
  type: "perform",
  resource: "tracking-form",
  title: "Delete Tracking Form",
  description: "Permanently delete a tracked web form. This cannot be undone; submission " +
    "tracking for this form stops immediately.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID", type: "number", required: true },
  ],
  output: [
    { key: "form_id", type: "number", label: "The deleted form's ID" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).delete(`/tracking/forms/${input.formId}`);
  },
};

export default trackingFormDelete;
