import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient } from "../lib/client.ts";
import { APP_ID_PARAM } from "../lib/params.ts";

interface Input {
  appId: string;
  lang?: "default" | "en" | "zh" | "ja" | "user";
}

interface GetFormFieldsResponse {
  properties: Record<string, unknown>;
  revision: string;
}

/**
 * `GET /k/v1/app/form/fields.json` — verified against
 * `docs/kintone/rest-api/apps/form/get-form-fields` 2026-09-05.
 *
 * The field codes and types an App accepts — the reference `record-add`,
 * `record-update` and `records-add`'s `record`/`records` params are built
 * against.
 */
const action: ActionDefinition<Input, GetFormFieldsResponse> = {
  key: "app-fields-get",
  type: "read",
  resource: "app",
  title: "Get Form Fields",
  description: "List an App's field codes, types and settings.",
  params: [
    APP_ID_PARAM,
    {
      key: "lang",
      label: "Language",
      type: "select",
      advanced: true,
      options: [
        { value: "default", label: "Default names" },
        { value: "en", label: "English" },
        { value: "zh", label: "Chinese" },
        { value: "ja", label: "Japanese" },
        { value: "user", label: "Authenticated user's language" },
      ],
      hint: "Which localized field labels to return, when the App has Localization enabled. " +
        "Defaults to the App's default names.",
    },
  ],
  output: [
    { key: "properties", label: "Fields", type: "object" },
    { key: "revision", label: "Form Revision", type: "string" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Kintone form fields", { appId: input.appId });
    return await new KintoneClient(ctx).request<GetFormFieldsResponse>("/app/form/fields", {
      query: compact({ app: input.appId, lang: input.lang }),
    });
  },
};

export default action;
