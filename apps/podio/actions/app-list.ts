import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, flag, PodioClient, stripSecretsAll } from "../lib/client.ts";
import { spaceIdParam } from "../lib/params.ts";

/**
 * `GET /app/space/{space_id}/` — "Returns all the apps on the space that are
 * visible. The apps are sorted by any custom ordering and else by name."
 *
 * "App" here is a Podio *app* — a user-defined record type, the thing whose
 * items you read and write. It is not this integration.
 *
 * The documented list response carries only `app_id`, `status`, `space_id` and
 * a short `config`; the field schema is not in it. Get App Fields is the call
 * for that, one app at a time.
 *
 * The response is passed through the secret-stripper even though the documented
 * short form has no `token`: the long form of the same entity does, this action
 * and Get App return the same kind of object, and a list projection that widens
 * one day should not be the thing that decides whether a credential leaks.
 */
interface Input {
  spaceId: string;
  includeInactive?: boolean;
}

const appList: ActionDefinition<Input> = {
  key: "app-list",
  type: "read",
  resource: "app",
  title: "List Apps in Workspace",
  description: "Every visible Podio app (record type) in a workspace, with its id and basic " +
    "configuration. Use Get App Fields for one app's field schema.",
  params: [
    spaceIdParam,
    {
      key: "includeInactive",
      label: "Include inactive apps",
      type: "boolean",
      hint: "Podio defaults to false, which hides deactivated apps.",
    },
  ],
  output: [{ key: "apps", type: "array", label: "Apps" }],

  async execute(input, ctx) {
    const apps = await new PodioClient(ctx).json<unknown[]>(
      `/app/space/${encodeSegment(input.spaceId)}/`,
      { query: { include_inactive: flag(input.includeInactive) } },
    );
    return { apps: stripSecretsAll(apps ?? []) };
  },
};

export default appList;
