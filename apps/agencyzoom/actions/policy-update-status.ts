import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type GenericSuccessResponse } from "../lib/client.ts";
import { policyStatusOptions } from "../lib/params.ts";

/** `POST /v1/api/policies/update-status` — cancel, activate, renew or rewrite a policy. */
interface Input {
  policyId: number;
  status: number;
}

const policyUpdateStatus: ActionDefinition<Input> = {
  key: "policy-update-status",
  type: "perform",
  resource: "policy",
  title: "Update Policy Status",
  description: "Change a policy's status (cancelled, active, renewed, reinstated, rewritten).",
  idempotent: true,
  params: [
    { key: "policyId", label: "Policy ID", type: "number", required: true },
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      options: policyStatusOptions,
    },
  ],
  output: [{ key: "message", type: "string", label: "Confirmation message" }],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<GenericSuccessResponse>("/policies/update-status", {
      policyId: input.policyId,
      status: input.status,
    });
  },
};

export default policyUpdateStatus;
