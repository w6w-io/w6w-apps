import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";

/**
 * `GET /v3/custom-fields` — every custom field your contacts can carry, for
 * your team and your organization. Requires `contacts:read`.
 *
 * Answers a **bare JSON array** — the one exception in this app's surface to
 * the `{items, hasMore}` envelope every other list endpoint uses, and there is
 * no paging: it is "one flat array, no paging" per the vendor's own summary.
 */
interface CustomField {
  id: number;
  title: string;
  fieldType: "text" | "number";
  orgWide: boolean;
}

const customFieldList: ActionDefinition<Record<string, never>, CustomField[]> = {
  key: "custom-field-list",
  type: "read",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List every custom field your contacts can carry, for your team and organization.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Field ID" },
    { key: "title", type: "string", label: "Field title" },
    { key: "fieldType", type: "string", label: "text | number" },
    { key: "orgWide", type: "boolean", label: "Whether the field is shared org-wide" },
  ],

  execute(_input, ctx) {
    return new ReplyClient(ctx).json<CustomField[]>("/custom-fields");
  },
};

export default customFieldList;
