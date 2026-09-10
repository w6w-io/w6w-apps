import type { ActionDefinition } from "@w6w/types";

/**
 * NOTE for the reader (and for M3): this comment quotes `type: "group"` in
 * prose, on purpose. A text grep for the literal string would count this
 * line as well as the real declaration below and over-report; the structural
 * check below reads the parsed `params` array and must flag exactly one
 * issue, naming the action — not this comment.
 */
interface Input {
  name: string;
  meta?: Record<string, unknown>;
}

const createThing: ActionDefinition<Input> = {
  key: "create-thing",
  type: "perform",
  resource: "thing",
  title: "Create Thing",
  description:
    "Fixture action with a `group` param that declares no `children`.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "meta",
      label: "Meta",
      type: "group",
      // No `children` — falls back to the JSON editor (T1.1.1), which is
      // exactly the unreachable shape check (b) exists to catch.
    },
  ],
  execute(input, _ctx) {
    return { name: input.name, meta: input.meta };
  },
};

export default createThing;
