import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizerId: string;
}

const getOrganizer: ActionDefinition<Input> = {
  key: "get-organizer",
  type: "read",
  resource: "organizer",
  title: "Get Organizer",
  description: "Retrieve a single organizer by ID.",
  params: [
    { key: "organizerId", label: "Organizer ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(`/organizers/${input.organizerId}/`);
  },
};

export default getOrganizer;
