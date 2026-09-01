import type { ActionDefinition } from "@w6w/types";
import { requestInvitations } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET https://invitations-api.trustpilot.com/v1/private/business-units/{businessUnitId}/templates`
 * — private, OAuth (client-credentials) auth. Note the different host — see
 * `lib/client.ts` for why this app splits its requests across two origins.
 *
 * Trustpilot's own suggested first call before sending an invitation: "To get a list of
 * templates available to you, use the following call... If you're not sure where to
 * start, go to Create Invitation(s)."
 */
interface Input {
  businessUnitId: string;
}

interface Template {
  id?: string;
  name?: string;
  isDefaultTemplate?: boolean;
  locale?: string;
  language?: string;
  type?: string;
}

interface Output {
  items: Template[];
}

const invitationListTemplates: ActionDefinition<Input, Output> = {
  key: "invitation-list-templates",
  type: "read",
  resource: "invitation",
  title: "List Invitation Templates",
  description: "List the review-invitation templates available for a Business Unit.",
  params: [businessUnitIdParam],
  output: [
    { key: "items", type: "array", label: "Templates" },
  ],

  async execute(input, ctx) {
    const body = await requestInvitations<{ templates?: Template[] }>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/templates`,
    );
    return { items: body?.templates ?? [] };
  },
};

export default invitationListTemplates;
