import type { ActionDefinition } from "@w6w/types";
import { compact, PhantomBusterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /agents/stop` — stops an agent. Safe to retry: stopping an agent that
 * is already stopped is a no-op on the vendor's side, not a new side effect.
 */
interface Input {
  id: string;
  softAbort?: boolean;
  cascadeToAllSlaves?: boolean;
  dontLaunchSoon?: boolean;
  switchToManualLaunch?: boolean;
}

const agentStop: ActionDefinition<Input> = {
  key: "agent-stop",
  type: "perform",
  title: "Stop Agent",
  description: "Stop an agent's running instance(s).",
  idempotent: true,
  params: [
    idParam,
    {
      key: "softAbort",
      label: "Soft abort",
      type: "boolean",
      hint: "Try to abort softly rather than killing the container outright.",
    },
    {
      key: "cascadeToAllSlaves",
      label: "Cascade to slave agents",
      type: "boolean",
      hint: "Recursively stop slave agents too, including nested slaves.",
    },
    {
      key: "dontLaunchSoon",
      label: "Cancel next scheduled launch",
      type: "boolean",
      hint: 'Disables the agent\'s next scheduled "launch soon", if any.',
    },
    {
      key: "switchToManualLaunch",
      label: "Switch to manual launch",
      type: "boolean",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const { status } = await client.postRaw(
      "/agents/stop",
      compact({
        id: input.id,
        softAbort: input.softAbort,
        cascadeToAllSlaves: input.cascadeToAllSlaves,
        dontLaunchSoon: input.dontLaunchSoon,
        switchToManualLaunch: input.switchToManualLaunch,
      }),
    );
    return { status };
  },
};

export default agentStop;
