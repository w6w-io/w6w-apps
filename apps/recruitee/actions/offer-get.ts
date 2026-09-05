import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";
import { offerIdParam } from "../lib/params.ts";

/** `GET /c/{company_id}/offers/{id}` — "Show offer". */
interface Input {
  offerId: number;
}

const offerGet: ActionDefinition<Input> = {
  key: "offer-get",
  type: "read",
  resource: "offer",
  title: "Get Job Offer",
  description: "Fetch a single job offer by id.",
  params: [offerIdParam],
  output: [{ key: "offer", type: "object", label: "The job offer" }],

  execute(input, ctx) {
    return new RecruiteeClient(ctx).request(`/offers/${input.offerId}`);
  },
};

export default offerGet;
