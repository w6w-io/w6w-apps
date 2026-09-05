import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { serviceDeskId } from "../lib/params.ts";

interface Input {
  serviceDeskId: string;
}

const servicedeskGet: ActionDefinition<Input> = {
  key: "servicedesk-get",
  type: "read",
  resource: "servicedesk",
  title: "Get Service Desk",
  description: "Look up one service desk by id.",
  params: [serviceDeskId],
  output: [
    { key: "id", type: "string", label: "Service desk ID" },
    { key: "projectId", type: "string", label: "Peer project ID" },
    { key: "projectKey", type: "string", label: "Peer project key" },
    { key: "projectName", type: "string", label: "Project / service desk name" },
  ],

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/servicedesk/${encodeURIComponent(input.serviceDeskId)}`,
    );
  },
};

export default servicedeskGet;
