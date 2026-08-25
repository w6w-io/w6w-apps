import type { AppDefinition } from "@w6w/types";

// Pulls in `lib/client.ts` so the auditor's source scan has something to
// walk — see `lib/client.ts` for the three host literals this fixture pins.
import "./lib/client.ts";

export default {
  actions: [],
} satisfies AppDefinition;
