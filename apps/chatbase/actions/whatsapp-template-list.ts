import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `GET /agents/{agentId}/whatsapp/templates` — approved templates across
 * every WhatsApp Business Account connected to the agent. `complete: false`
 * means at least one account could not be read; the list is then partial,
 * not exhaustive. Each template's `variables` names the shape Send Template
 * expects, grouped by component (`header`, `body`, …) in order of appearance.
 */
interface Input {
  agentId: string;
}

const whatsappTemplateList: ActionDefinition<Input> = {
  key: "whatsapp-template-list",
  type: "read",
  resource: "whatsapp-template",
  title: "List WhatsApp Templates",
  description:
    "List approved WhatsApp templates across the agent's connected WhatsApp Business Accounts.",
  params: [agentIdParam],
  output: [
    { key: "templates", type: "array", label: "Approved templates" },
    { key: "complete", type: "boolean", label: "False if some accounts could not be read" },
    { key: "unavailableWabaIds", type: "array", label: "Accounts that failed to read — retry" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/whatsapp/templates`,
    );
  },
};

export default whatsappTemplateList;
