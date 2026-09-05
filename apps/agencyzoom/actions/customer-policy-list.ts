import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/customers/{customerId}/policies` — the policies written for a
 * customer (as opposed to `/customers/{customerId}/ams-policies`, this app
 * does not cover, which reads AMS-synced policies from a connected agency
 * management system rather than what AgencyZoom itself wrote).
 *
 * ## The documented response schema does not match its own description
 *
 * The OpenAPI document's response schema for this endpoint is a single,
 * flat `WrittenPolicy` object — not `type: array, items: WrittenPolicy` —
 * even though its own description reads "The list of policies' information"
 * and the endpoint returns *a customer's* policies (plural, in general). That
 * is very likely a documentation bug rather than the real wire shape: a
 * customer with two policies cannot fit in one flat object under any
 * consistent reading of the schema. This action normalizes defensively
 * instead of trusting either shape blindly — see `normalizePolicies` below,
 * which is exported so this can be verified once a live response is
 * available, without re-deriving it by trial and error against a production
 * account.
 */
interface Input {
  customerId: number;
}

interface WrittenPolicy {
  id?: number;
  policyNumber?: string;
  premium?: number;
  status?: number;
  [key: string]: unknown;
}

/**
 * Handle whichever shape the endpoint actually answers with: a bare array (the
 * plausible real shape), a single object (the documented schema, taken
 * literally), or an object wrapping the list under a `policies` key (the shape
 * `CustomerDetail` uses elsewhere in this same API).
 */
export function normalizePolicies(body: unknown): WrittenPolicy[] {
  if (Array.isArray(body)) return body as WrittenPolicy[];
  if (body && typeof body === "object") {
    const wrapped = (body as { policies?: unknown }).policies;
    if (Array.isArray(wrapped)) return wrapped as WrittenPolicy[];
    if (Object.keys(body).length > 0) return [body as WrittenPolicy];
  }
  return [];
}

const customerPolicyList: ActionDefinition<Input> = {
  key: "customer-policy-list",
  type: "read",
  resource: "policy",
  title: "List Customer Policies",
  description: "List the policies written for a customer (not AMS-synced policies).",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
  ],
  output: [{ key: "policies", type: "array", label: "Policies (premium in cents)" }],

  async execute(input, ctx) {
    const body = await new AgencyZoomClient(ctx).get(`/customers/${input.customerId}/policies`);
    return { policies: normalizePolicies(body) };
  },
};

export default customerPolicyList;
