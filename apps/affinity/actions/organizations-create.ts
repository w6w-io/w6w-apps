import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact, toIdList } from "../lib/client.ts";

/** `POST /organizations`. */
interface Input {
  name: string;
  domain?: string;
  personIds?: string;
}

const organizationsCreate: ActionDefinition<Input> = {
  key: "organizations-create",
  type: "perform",
  resource: "organization",
  title: "Create Organization",
  description: "Create a new organization.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      hint: "Used by Affinity to automatically associate people with this organization.",
    },
    { key: "personIds", label: "Person IDs", type: "string", hint: "Comma-separated." },
  ],
  output: [{ key: "id", type: "number", label: "Organization ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/organizations", {
      method: "POST",
      body: compact({
        name: input.name,
        domain: input.domain,
        person_ids: toIdList(input.personIds),
      }),
    });
  },
};

export default organizationsCreate;
