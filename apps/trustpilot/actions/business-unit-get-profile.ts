import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET /v1/business-units/{businessUnitId}/profileinfo` — public, API-Key auth.
 *
 * Returns the company profile Trustpilot shows on the Business Unit's page: contact
 * details, address, description and social-media links. Verified against the Business
 * Units API reference on 2026-09-01.
 */
interface Input {
  businessUnitId: string;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
}

interface Description {
  header?: string;
  text?: string;
}

interface Output {
  isSubscriber?: boolean;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: Address;
  description?: Description;
  socialmedia?: Record<string, string | null>;
  facebookPageId?: number;
  facebookPageUrl?: string;
  isFacebookActivated?: boolean;
  isCommentsEnabled?: boolean;
  isIncentivisingUsers?: boolean;
  isClaimed?: boolean;
}

const businessUnitGetProfile: ActionDefinition<Input, Output> = {
  key: "business-unit-get-profile",
  type: "read",
  resource: "business-unit",
  title: "Get Business Unit Profile",
  description: "Get company profile information for a Trustpilot Business Unit.",
  params: [businessUnitIdParam],
  output: [
    { key: "companyName", type: "string", label: "Company name" },
    { key: "email", type: "string", label: "Contact email" },
    { key: "phone", type: "string", label: "Contact phone" },
    { key: "address", type: "object", label: "Address" },
    { key: "description", type: "object", label: "Description" },
    { key: "socialmedia", type: "object", label: "Social media links" },
    { key: "isClaimed", type: "boolean", label: "Profile claimed" },
    { key: "isSubscriber", type: "boolean", label: "Is a Trustpilot subscriber" },
    { key: "isCommentsEnabled", type: "boolean", label: "Comments enabled" },
    { key: "isIncentivisingUsers", type: "boolean", label: "Incentivises reviews" },
  ],

  async execute(input, ctx) {
    return await requestApi<Output>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/profileinfo`,
    );
  },
};

export default businessUnitGetProfile;
