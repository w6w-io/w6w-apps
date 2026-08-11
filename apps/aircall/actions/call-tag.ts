import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId, toIdList } from "../lib/client.ts";
import { callIdParam } from "../lib/params.ts";

interface Input {
  callId: string;
  tags: string[] | string;
}

/**
 * `POST /v1/calls/:id/tags` — apply Tags to a Call. Answers **201**.
 *
 * Tags must already exist: they are created from the Dashboard or with the
 * Create Tag action, and this endpoint takes **ids**, not names. Use List Tags
 * to resolve names to ids once and reuse them.
 */
const callTag: ActionDefinition<Input> = {
  key: "call-tag",
  type: "perform",
  resource: "call",
  title: "Tag Call",
  description: "Apply one or more existing Tags to a Call, by Tag ID.",
  // Deliberately NOT marked retryable, even though set-assignment usually is.
  // Aircall documents neither whether a repeated id replaces the existing set or
  // appends to it, nor what happens to a duplicate — and an undocumented append
  // would turn one retry into a doubled tag list on a Call. Unverifiable without
  // a live account, so the conservative reading stands.
  idempotent: false,
  params: [
    callIdParam,
    {
      key: "tags",
      label: "Tag IDs",
      type: "multiselect",
      required: true,
      hint:
        "Numeric Tag IDs, not names. Tags must already exist — create them in the Dashboard or " +
        "with the Create Tag action.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status — 201 on success" }],

  async execute(input, ctx) {
    const tags = toIdList(input.tags);
    if (!tags) throw new Error("Tag Call needs at least one numeric Tag ID");
    const client = new AircallClient(ctx);
    const status = await client.status(`/calls/${encodeId(input.callId)}/tags`, {
      method: "POST",
      body: { tags },
    });
    return { status };
  },
};

export default callTag;
