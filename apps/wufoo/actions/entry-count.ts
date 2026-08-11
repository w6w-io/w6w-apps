import type { ActionDefinition } from "@w6w/types";
import { WufooClient } from "../lib/client.ts";

/**
 * `GET /forms/{identifier}/entries/count.json` — how many submissions a form has.
 *
 * The response is `{"EntryCount": "42"}` — a **string**, like every other scalar
 * in this API. It is returned as Wufoo sends it rather than coerced, so a
 * workflow sees the same value the vendor documents; the label says so.
 *
 * This is the cheap way to answer "has anything new arrived?" without pulling a
 * page of entries.
 */
interface Input {
  identifier: string;
}

const entryCount: ActionDefinition<Input> = {
  key: "entry-count",
  type: "read",
  resource: "entry",
  title: "Count Form Entries",
  description: "Get a form's total submission count without fetching the entries.",
  params: [
    {
      key: "identifier",
      label: "Form hash or title",
      type: "string",
      required: true,
      placeholder: "s1afea8b1vk0jf7",
    },
  ],
  output: [
    { key: "EntryCount", type: "string", label: "Total entries — a string, as Wufoo returns it" },
  ],

  execute(input, ctx) {
    return new WufooClient(ctx).request(
      `/forms/${encodeURIComponent(input.identifier)}/entries/count.json`,
    );
  },
};

export default entryCount;
