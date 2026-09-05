import type { ActionDefinition } from "@w6w/types";
import { GraphClient, notebookPath, odataList } from "../lib/client.ts";
import { locationParams, notebookIdParam, notebookOutput, selectParams } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  notebookId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/onenote/notebooks/{id}` · `GET /users/{id}/onenote/notebooks/{id}` ·
 * `GET /groups/{id}/onenote/notebooks/{id}` · `GET /sites/{id}/onenote/notebooks/{id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/notebook-get
 *
 * Valid `$expand` values are `sections` and `sectionGroups`.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite`. Supported for both work-or-school and personal Microsoft
 * accounts.
 */
const getNotebook: ActionDefinition<Input> = {
  key: "get-notebook",
  type: "read",
  resource: "notebook",
  title: "Get Notebook",
  description: "Get a single OneNote notebook by its ID.",
  params: [
    ...locationParams(),
    notebookIdParam,
    ...selectParams("OData `$expand`, e.g. `sections`, `sectionGroups`."),
  ],
  output: notebookOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(notebookPath(input, input.notebookId), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getNotebook;
