import type { ActionDefinition } from "@w6w/types";
import { ContentfulClient, resolveScope } from "../lib/client.ts";

interface Input {
  contentTypeId: string;
  fields: Record<string, unknown>;
  spaceId?: string;
  environmentId?: string;
}

/**
 * Contentful Management API — create a new entry. Requires a Management token
 * on the connection. The `X-Contentful-Content-Type` header tells Contentful
 * which content type to instantiate; `fields` is the locale-keyed field map
 * (e.g. `{ title: { "en-US": "Hello" } }`).
 */
const createEntry: ActionDefinition<Input> = {
  key: "create-entry",
  type: "perform",
  resource: "entry",
  title: "Create Entry",
  description: "Create a new entry via the Management API. Requires a Management token.",
  params: [
    { key: "contentTypeId", label: "Content Type ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Locale-keyed field map, e.g. `{ \"title\": { \"en-US\": \"Hello\" } }`.",
    },
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "environmentId", label: "Environment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const { spaceId, environmentId } = resolveScope(input, ctx);
    const client = new ContentfulClient(ctx);
    return client.request(
      `/spaces/${spaceId}/environments/${environmentId}/entries`,
      {
        method: "POST",
        base: "management",
        headers: { "X-Contentful-Content-Type": input.contentTypeId },
        body: { fields: input.fields },
      },
    );
  },
};

export default createEntry;
