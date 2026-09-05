import type { ActionDefinition } from "@w6w/types";
import { type Product, PRODUCT_OPTIONS, WebinarJamClient } from "../lib/client.ts";

/**
 * `POST /{product}/webinar` — "get details about one particular webinar",
 * verified against WebinarJam (article 15370150) and EverWebinar (15370155):
 * identical field shape both times, down to the same `schedules[]` object
 * form (`date`/`schedule`/`comment`) and the same conditional registration/
 * room-link fields.
 *
 * The vendor's own warning is worth repeating verbatim: "The Schedule ID
 * retrieved through the API does NOT match the Schedule ID shown in the
 * Schedules tab of your webinar settings. Be sure to use the API-generated
 * ID" — the `schedule` field on each entry here, not anything read off the
 * dashboard UI, is what `registrant-create`'s `schedule` param expects.
 */
interface WebinarSchedule {
  date?: string;
  schedule?: number;
  comment?: string;
}

interface WebinarPresenter {
  name?: string;
  email?: string;
  picture?: string;
}

interface WebinarDetail {
  webinar_id?: number;
  webinar_hash?: string;
  name?: string;
  title?: string;
  description?: string;
  type?: string | null;
  schedules?: WebinarSchedule[];
  timezone?: string;
  presenters?: WebinarPresenter[];
  registration_url?: string;
  registration_type?: string;
  registration_fee?: number;
  registration_currency?: string;
  registration_checkout_url?: string;
  registration_post_payment_url?: string;
  direct_live_room_url?: string;
  direct_replay_room_url?: string;
}

interface Response {
  status?: string;
  webinar?: WebinarDetail;
}

interface Input {
  product: Product;
  webinarId: number;
}

const webinarGet: ActionDefinition<Input> = {
  key: "webinar-get",
  type: "read",
  resource: "webinar",
  title: "Get Webinar",
  description:
    "Read one webinar's schedules (with their API-generated schedule IDs), presenters, " +
    "registration links and direct room links.",
  params: [
    {
      key: "product",
      label: "Product",
      type: "select",
      required: true,
      default: "webinarjam",
      options: PRODUCT_OPTIONS,
    },
    { key: "webinarId", label: "Webinar ID", type: "number", required: true },
  ],
  output: [
    { key: "webinar", type: "object", label: "Webinar" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarJamClient(ctx).request<Response>(
      input.product,
      "/webinar",
      { webinar_id: input.webinarId },
    );
    return { webinar: body.webinar ?? null };
  },
};

export default webinarGet;
