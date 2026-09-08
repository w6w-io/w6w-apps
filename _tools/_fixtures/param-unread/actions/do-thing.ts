import type { ActionDefinition } from "@w6w/types";

interface Input {
  used: string;
  unused: string;
}

/** `used` is read; `unused` is declared but never touched by `execute`. */
const doThing: ActionDefinition<Input> = {
  key: "do-thing",
  type: "perform",
  resource: "thing",
  title: "Do Thing",
  description: "Fixture action for `param/unread` — one param read, one not.",
  params: [
    { key: "used", label: "Used", type: "string" },
    { key: "unused", label: "Unused", type: "string" },
  ],
  execute(input, _ctx) {
    return { value: input.used };
  },
};

export default doThing;
