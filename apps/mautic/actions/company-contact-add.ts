import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { COMPANY_ID_PARAM, CONTACT_ID_PARAM } from "../lib/params.ts";

/**
 * `POST /companies/{companyId}/contact/{contactId}/add` — verified against
 * Mautic's REST API docs (`companies.html`, "Add Contact to Company").
 */
const action: ActionDefinition = {
  key: "company-contact-add",
  type: "perform",
  resource: "company",
  title: "Add a contact to a company",
  description: "Associate a contact with a company.",
  idempotent: true,
  params: [COMPANY_ID_PARAM, CONTACT_ID_PARAM],
  output: [{ key: "success", type: "number", label: "1 on success" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = Number(p.companyId);
    const contactId = Number(p.contactId);
    if (!Number.isFinite(companyId)) throw new Error("`companyId` must be a number");
    if (!Number.isFinite(contactId)) throw new Error("`contactId` must be a number");

    ctx.log("info", "adding a contact to a Mautic company", { companyId, contactId });

    return await new MauticClient(ctx).request(
      `/companies/${companyId}/contact/${contactId}/add`,
      { method: "POST" },
    );
  },
};

export default action;
