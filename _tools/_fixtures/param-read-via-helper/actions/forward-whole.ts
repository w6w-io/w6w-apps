import type { ActionDefinition } from "@w6w/types";
import { forwardWhole } from "../lib/client.ts";

interface Input {
  payload: string;
}

/**
 * Exemption shape (i): the bare parameter identifier handed whole to a call —
 * `crmBatchCreate(ctx, "contacts", input)` (`apps/hubspot/actions/
 * batch-create-contacts.ts:21`). `execute` never writes `input.payload`
 * anywhere, yet the param IS read — by the callee, which this scan cannot
 * see into. Must yield zero `param/unread`.
 */
const forwardWholeAction: ActionDefinition<Input> = {
  key: "forward-whole",
  type: "perform",
  resource: "thing",
  title: "Forward Whole",
  description: "Fixture action forwarding its whole input to a helper.",
  params: [
    { key: "payload", label: "Payload", type: "json" },
  ],
  execute(input, _ctx) {
    return forwardWhole("things", input);
  },
};

export default forwardWholeAction;
