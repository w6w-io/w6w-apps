import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/** `GET /webinars/{id}` — a single webinar, with its episodes, broadcasts and registration fields. */
interface Input {
  id: number;
  includePast?: boolean;
}

const webinarGet: ActionDefinition<Input> = {
  key: "webinar-get",
  type: "read",
  resource: "webinar",
  title: "Get Webinar",
  description: "Retrieve a specific webinar by ID.",
  params: [
    { key: "id", label: "Webinar ID", type: "number", required: true },
    {
      key: "includePast",
      label: "Include past broadcasts",
      type: "boolean",
      default: false,
      hint: "Include broadcasts that already happened in each nested episode.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webinar ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "url", type: "string", label: "Registration page URL" },
    { key: "ondemand", type: "boolean", label: "On demand" },
    { key: "episodes", type: "array", label: "Episodes" },
    { key: "registration_fields", type: "array", label: "Registration fields" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/webinars/${input.id}`, {
      query: { include_past: input.includePast },
    });
  },
};

export default webinarGet;
