import type { ActionDefinition } from "@w6w/types";

interface Input {
  from: string;
  to: string;
}

/**
 * The mailjet shape (M5): a helper declared in the SAME file
 * (`apps/mailjet/actions/send-email.ts`'s `buildMessage`, declared at `:72`,
 * called from `execute` at `:163`) reads `input.from`/`input.to` inside its
 * OWN body, not inside `execute`'s. The scan is per-FILE, not per-`execute`-
 * body, so this must still count as a read. Must yield zero `param/unread`.
 */
function buildMessage(input: Input) {
  return { from: input.from, to: input.to };
}

const sameFileHelper: ActionDefinition<Input> = {
  key: "same-file-helper",
  type: "perform",
  resource: "thing",
  title: "Same File Helper",
  description: "Fixture action reading params through a same-file helper.",
  params: [
    { key: "from", label: "From", type: "string", required: true },
    { key: "to", label: "To", type: "string", required: true },
  ],
  execute(input, _ctx) {
    return buildMessage(input);
  },
};

export default sameFileHelper;
