import type { ActionDefinition } from "@w6w/types";
import { compact, LearnWorldsClient } from "../lib/client.ts";

/**
 * `POST /v2/users/{id}/enrollment` — enroll a user in a course, bundle or
 * subscription. `price` is required by the spec even for a free/manual
 * enrollment (send `0`) — it records what the user is considered to have
 * paid, for reporting, not what gets charged.
 */
interface Input {
  id: string;
  productId: string;
  productType: string;
  price: number;
  justification?: string;
  durationType?: string;
  duration?: number;
  sendEnrollmentEmail?: boolean;
}

const userEnroll: ActionDefinition<Input> = {
  key: "user-enroll",
  type: "perform",
  resource: "enrollment",
  title: "Enroll a User",
  description: "Enroll a user in a course, bundle, or subscription.",
  // Enrolling the same user in the same product twice is not guaranteed to
  // be a no-op — LearnWorlds does not document this endpoint as idempotent,
  // and a second call could record a second manual payment.
  idempotent: false,
  params: [
    { key: "id", label: "User ID or email", type: "string", required: true },
    { key: "productId", label: "Product ID", type: "string", required: true },
    {
      key: "productType",
      label: "Product type",
      type: "select",
      required: true,
      options: [
        { label: "Course", value: "course" },
        { label: "Bundle", value: "bundle" },
        { label: "Subscription", value: "subscription" },
      ],
    },
    {
      key: "price",
      label: "Price",
      type: "number",
      required: true,
      default: 0,
      hint: "What the user is recorded as having paid. Use 0 for a free/manual enrollment.",
    },
    {
      key: "justification",
      label: "Justification",
      type: "string",
      hint: "Note for the enrollment record.",
    },
    {
      key: "durationType",
      label: "Duration type",
      type: "select",
      options: [
        { label: "Days", value: "days" },
        { label: "Weeks", value: "weeks" },
        { label: "Months", value: "months" },
      ],
      hint: "Subscriptions only.",
    },
    { key: "duration", label: "Duration", type: "number", hint: "Subscriptions only." },
    { key: "sendEnrollmentEmail", label: "Send enrollment email", type: "boolean" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "enrolling a LearnWorlds user", { id: input.id, productId: input.productId });

    const body = compact({
      productId: input.productId,
      productType: input.productType,
      price: input.price,
      justification: input.justification,
      duration_type: input.durationType,
      duration: input.duration,
      send_enrollment_email: input.sendEnrollmentEmail,
    });

    await new LearnWorldsClient(ctx).request(
      `/v2/users/${encodeURIComponent(input.id)}/enrollment`,
      { method: "POST", body },
    );
    return { success: true };
  },
};

export default userEnroll;
