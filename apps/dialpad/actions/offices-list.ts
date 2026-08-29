import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, type DialpadPage } from "../lib/client.ts";
import { cursorParam } from "../lib/params.ts";

/**
 * `GET /api/v2/offices` — list the company's offices.
 *
 * Included because several other actions in this app (`users-create`,
 * `rooms-create`, `callrouters-create`) require an office id, and there is no
 * other way to look one up. Also the endpoint this app's Auth `test` probe
 * uses — see `auth/api-key.ts` for why.
 */
interface Input {
  cursor?: string;
  activeOnly?: boolean;
}

const officesList: ActionDefinition<Input> = {
  key: "offices-list",
  type: "search",
  resource: "office",
  title: "List Offices",
  description: "List the company's offices.",
  params: [
    cursorParam,
    { key: "activeOnly", label: "Active only", type: "boolean" },
  ],
  output: [
    { key: "cursor", type: "string", label: "Next page cursor (null on the last page)" },
    { key: "items", type: "array", label: "Offices on this page" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json<DialpadPage<unknown>>("/offices", {
      query: { cursor: input.cursor, active_only: input.activeOnly },
    });
  },
};

export default officesList;
