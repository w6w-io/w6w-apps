import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { COMPANY_ID_PARAM } from "../lib/params.ts";

/**
 * `GET /companies/{id}` — verified against Mautic's REST API docs
 * (`companies.html`, "Get Company").
 */
const action: ActionDefinition = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get a company",
  description: "Retrieve a single company by ID.",
  params: [COMPANY_ID_PARAM],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = Number(p.companyId);
    if (!Number.isFinite(id)) throw new Error("`companyId` must be a number");

    ctx.log("info", "getting a Mautic company", { id });

    const body = await new MauticClient(ctx).request<{ company: unknown }>(`/companies/${id}`);
    return body.company;
  },
};

export default action;
