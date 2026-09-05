import type { ActionDefinition } from "@w6w/types";
import { type Product, PRODUCT_OPTIONS, WebinarJamClient } from "../lib/client.ts";

/**
 * `POST /{product}/webinars` — "retrieve a full list of all webinars published
 * in your account." Takes only `api_key`; verified identical field-for-field
 * against both the WebinarJam (article 15370149) and EverWebinar (15370154)
 * docs, down to the same example structure.
 *
 * EverWebinar's own example return carries no `type` field at all (every
 * EverWebinar webinar is an automated replay, so the field WebinarJam uses to
 * distinguish "Series of presentations"/"Single presentation"/"Always
 * on"/"Right now" has nothing to say) — `type` is therefore optional here
 * rather than assumed present.
 */
interface WebinarSummary {
  webinar_id?: number;
  webinar_hash?: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string | null;
  schedules?: string[];
  timezone?: string;
}

interface Response {
  status?: string;
  webinars?: WebinarSummary[];
}

interface Input {
  product: Product;
}

const webinarList: ActionDefinition<Input> = {
  key: "webinar-list",
  type: "read",
  resource: "webinar",
  title: "List Webinars",
  description: "List every webinar published in the account, for the chosen product.",
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      required: true,
      default: "webinarjam",
      options: PRODUCT_OPTIONS,
      hint: "WebinarJam (live sessions) or EverWebinar (automated, scheduled replays).",
    },
  ],
  output: [
    { key: "webinars", type: "array", label: "Webinars" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarJamClient(ctx).request<Response>(input.product, "/webinars");
    return { webinars: body.webinars ?? [] };
  },
};

export default webinarList;
