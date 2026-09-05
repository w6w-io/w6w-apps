import type { ActionDefinition } from "@w6w/types";
import { DevinClient } from "../lib/client.ts";
import { devinIdParam } from "../lib/params.ts";

/** `SessionAttachment` — a file sent during a session, by either side. */
interface SessionAttachment {
  attachment_id: string;
  name: string;
  source: "devin" | "user";
  url: string;
  content_type?: string | null;
}

/**
 * `GET /v3/organizations/{org_id}/sessions/{devin_id}/attachments` — every
 * file attached to a session, from either side of the conversation.
 *
 * `type: "read"` rather than `"search"`: the endpoint takes no cursor/limit
 * query parameters at all in the documented schema — it answers the whole,
 * bounded set for one known session in a single call.
 *
 * The `url` each entry carries is a **downloadable link** (Devin's own
 * download endpoint 307-redirects it to a presigned, time-limited storage
 * URL), but this app deliberately does not add a "download attachment"
 * Action: the redirect target is a vendor-controlled, per-request storage
 * host that cannot be named in advance, so it cannot be declared in
 * `w6w.network.allow` the way every other host this app calls can. A
 * workflow that needs the bytes should hand this `url` to an HTTP action that
 * accepts an arbitrary caller-supplied URL, which is exactly what
 * `network.allow`'s `"*"` escape hatch exists for and this app's fixed
 * allowlist deliberately does not claim.
 */
interface Input {
  devinId: string;
}

const sessionAttachmentList: ActionDefinition<Input, SessionAttachment[]> = {
  key: "session-attachment-list",
  type: "read",
  resource: "attachment",
  title: "List Session Attachments",
  description: "List every file attached to a session, from either side of the conversation.",
  params: [devinIdParam],
  output: [{ key: "", type: "array", label: "Attachments" }],

  execute(input, ctx) {
    return new DevinClient(ctx).org<SessionAttachment[]>(
      `/sessions/${encodeURIComponent(input.devinId)}/attachments`,
    );
  },
};

export default sessionAttachmentList;
