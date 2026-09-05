import type { ActionDefinition } from "@w6w/types";
import { KintoneClient } from "../lib/client.ts";
import { APP_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
}

interface GetAppResponse {
  appId: string;
  code: string;
  name: string;
  description: string;
  spaceId: string | null;
  threadId: string | null;
  createdAt: string;
  creator: { code: string; name: string };
  modifiedAt: string;
  modifier: { code: string; name: string };
}

/**
 * `GET /k/v1/app.json` — verified against `docs/kintone/rest-api/apps/get-app`
 * 2026-09-05. General App metadata: name, description, Space, creator/updater.
 * Not the App's own records or fields — see `records-search` and `app-fields-get`.
 */
const action: ActionDefinition<Input, GetAppResponse> = {
  key: "app-get",
  type: "read",
  resource: "app",
  title: "Get App",
  description: "Retrieve a Kintone App's name, description, Space and creator/updater metadata.",
  params: [APP_ID_PARAM],
  output: [
    { key: "appId", label: "App ID", type: "string" },
    { key: "code", label: "App Code", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "string" },
    { key: "spaceId", label: "Space ID", type: "string" },
    { key: "creator", label: "Creator", type: "object" },
    { key: "modifier", label: "Last Modifier", type: "object" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Kintone app", { appId: input.appId });
    return await new KintoneClient(ctx).request<GetAppResponse>("/app", {
      query: { id: input.appId },
    });
  },
};

export default action;
