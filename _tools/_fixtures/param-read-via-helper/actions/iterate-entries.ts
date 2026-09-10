import type { ActionDefinition } from "@w6w/types";

interface Input {
  a?: string;
  b?: string;
}

/**
 * Exemption shape (ii): generic iteration over every supplied key
 * (`for (const [k, v] of Object.entries(input))` —
 * `apps/asana/actions/create-task.ts:44-50`). Neither `a` nor `b` is ever
 * spelled out by name, yet both are read. Must yield zero `param/unread`.
 */
const iterateEntries: ActionDefinition<Input> = {
  key: "iterate-entries",
  type: "perform",
  resource: "thing",
  title: "Iterate Entries",
  description:
    "Fixture action forwarding via generic Object.entries iteration.",
  params: [
    { key: "a", label: "A", type: "string" },
    { key: "b", label: "B", type: "string" },
  ],
  execute(input, _ctx) {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      body[k] = v;
    }
    return body;
  },
};

export default iterateEntries;
