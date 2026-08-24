import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam, idParam } from "../lib/params.ts";

/** `GET /documents/{id}.json` — metadata only. See `document-download-get` for content. */
interface Input {
  id: number;
  fields?: string;
}

const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Fetch one document's metadata by id.",
  params: [
    idParam("Document ID"),
    fieldsParam(
      "id,etag,name,content_type,created_at,updated_at,received_at,matter{id,display_number}",
    ),
  ],
  output: [{ key: "data", type: "object", label: "The document's metadata" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data(`/documents/${input.id}.json`, {
      query: { fields: input.fields },
    });
  },
};

export default documentGet;
