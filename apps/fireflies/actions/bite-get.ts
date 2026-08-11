import type { ActionDefinition } from "@w6w/types";
import { BITE_FIELDS, FirefliesClient } from "../lib/client.ts";

interface Input {
  biteId: string;
  includeCaptions?: boolean;
}

function buildQuery(includeCaptions: boolean): string {
  return `
    query Bite($biteId: ID!) {
      bite(id: $biteId) {
        ${BITE_FIELDS}
        created_from { id name type description duration }
        sources { src type }
        user { id name first_name last_name }
        ${
    includeCaptions ? "captions { index speaker_id speaker_name text start_time end_time }" : ""
  }
      }
    }
  `;
}

const biteGet: ActionDefinition<Input> = {
  key: "bite-get",
  type: "read",
  resource: "bite",
  title: "Get Soundbite",
  description: "Fetch one soundbite (a clipped highlight of a meeting) by id.",
  params: [
    { key: "biteId", label: "Soundbite ID", type: "string", required: true },
    {
      key: "includeCaptions",
      label: "Include captions",
      type: "boolean",
      default: false,
      hint: "The clip's transcript lines.",
    },
  ],
  output: [
    { key: "bite.id", type: "string", label: "Soundbite ID" },
    { key: "bite.name", type: "string", label: "Name" },
    { key: "bite.status", type: "string", label: "Status" },
    { key: "bite.transcript_id", type: "string", label: "Transcript ID" },
    { key: "bite.start_time", type: "number", label: "Start (seconds)" },
    { key: "bite.end_time", type: "number", label: "End (seconds)" },
    { key: "bite.sources", type: "array", label: "Media sources" },
  ],

  execute(input, ctx) {
    return new FirefliesClient(ctx).query(buildQuery(input.includeCaptions === true), {
      biteId: input.biteId,
    });
  },
};

export default biteGet;
