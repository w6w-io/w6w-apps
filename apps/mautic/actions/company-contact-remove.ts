import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { COMPANY_ID_PARAM, CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /companies/{companyId}/contact/{contactId}/remove` — verified against
 * Mautic's REST API docs (`companies.html`, "Remove Contact from Company").
 */
const action: ActionDefinition = {
  key: "company-contact-remove",
  type: "perform",
  resource: "company",
  title: "Remove a contact from a company",
  description: "Disassociate a contact from a company.",
  idempotent: true,
  params: [COMPANY_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "number", label: "1 on success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = Number(p.companyId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(companyId)) throw new Error("`companyId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "removing a contact from a Mautic company", { companyId, contactId });

    return await new MauticClient(ctx).request(
      `/companies/${companyId}/contact/${contactId}/remove`,
      { method: "POST" },
    );
  },
};

export default action;
