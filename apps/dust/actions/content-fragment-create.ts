import type { ActionDefinition } from "@w6w/types";
import { CONVERSATION_ID_PARAM } from "../lib/params.ts";
import { DustClient } from "../lib/client.ts";

/**
 * `POST /assistant/conversations/{cId}/content_fragments` — verified against
 * the vendor's OpenAPI document ("Create a content fragment") and its
 * `ContentFragment` schema.
 *
 * A content fragment is how a workflow hands an agent raw context (a report,
 * a transcript, a URL) without it being a chat message from a "user" — the
 * schema documents it as needing EITHER `content` + `contentType` (inline
 * text, what this action supports) OR a previously-uploaded `fileId` (out of
 * scope here — this app declares no file-upload action). `title` is the
 * schema's only required field either way.
 *
 * Not idempotent — each call attaches a new, separate fragment; there is no
 * documented idempotency key or upsert-by-title behaviour.
 */
interface Input {
  cId: string;
  title: string;
  content: string;
  contentType?: string;
  url?: string;
}

const contentFragmentCreate: ActionDefinition<Input> = {
  key: "content-fragment-create",
  type: "perform",
  resource: "conversation",
  title: "Create Content Fragment",
  description: "Attach inline text (a document, transcript, or note) to a conversation as context.",
  idempotent: false,
  params: [
    CONVERSATION_ID_PARAM,
    { key: "title", label: "Title", type: "string", required: true },
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "text/plain",
      hint: "MIME type of `content`, e.g. `text/plain`, `text/markdown`, `text/csv`.",
    },
    {
      key: "url",
      label: "Source URL",
      type: "string",
      advanced: true,
      hint: "Optional link back to where this content came from.",
    },
  ],
  output: [{ key: "contentFragment", type: "object", label: "Created content fragment" }],

  execute(input, ctx) {
    return new DustClient(ctx).json(
      `/assistant/conversations/${encodeURIComponent(input.cId)}/content_fragments`,
      {
        method: "POST",
        body: {
          title: input.title,
          content: input.content,
          contentType: input.contentType || "text/plain",
          url: input.url || undefined,
        },
      },
    );
  },
};

export default contentFragmentCreate;
