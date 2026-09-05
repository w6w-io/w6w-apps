import type { ActionDefinition } from "@w6w/types";
import { compact, JudgeMeClient } from "../lib/client.ts";

/**
 * `POST /reviews` — Create.
 *
 * Documented with `security: []` — "No authentication needed" — the same path
 * a storefront's own public review form posts to. `shopDomain` and `platform`
 * therefore travel in the request BODY rather than coming from a Connection;
 * this action is marked `requiresAuth: false` and works with no Connection at
 * all, exactly like the widget the vendor itself describes it as mirroring.
 *
 * The vendor also states this endpoint creates nothing when the store has
 * "disabled web reviews" — a silent no-op the API gives no distinct signal
 * for, so a 200 here does not by itself prove a review now exists.
 *
 * Like `count-reviews`, the document gives this a `200` with no response
 * schema (`{"description": "", "headers": {}}`), so the raw body is returned
 * as-is rather than assuming a shape.
 */
interface CfAnswer {
  cf_question_id: number;
  value: string;
}

interface Input {
  shopDomain: string;
  platform: "shopify" | "woocommerce" | "bigcommerce";
  productExternalId?: number;
  email: string;
  name: string;
  reviewerNameFormat?: "" | "last_initial" | "all_initials" | "anonymous";
  rating: number;
  title?: string;
  body: string;
  cfAnswers?: CfAnswer[];
  pictureUrls?: string[];
  ipAddr?: string;
}

const createReview: ActionDefinition<Input> = {
  key: "create-review",
  type: "perform",
  resource: "review",
  title: "Create Review",
  description:
    "Submit a web review, the same way a storefront's own review form does. Needs no Connection " +
    "at all — Judge.me documents this endpoint as unauthenticated. Creates nothing if the store " +
    "has disabled web reviews, with no distinct signal for that case.",
  idempotent: false,
  requiresAuth: false,
  params: [
    {
      key: "shopDomain",
      label: "Shop Domain",
      type: "string",
      required: true,
      placeholder: "example.myshopify.com",
    },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      options: [
        { value: "shopify", label: "Shopify" },
        { value: "woocommerce", label: "WooCommerce" },
        { value: "bigcommerce", label: "BigCommerce" },
      ],
    },
    {
      key: "productExternalId",
      label: "Product External ID",
      type: "number",
      hint: "The store platform's own product id (e.g. Shopify product id). Leave blank for a " +
        "shop-level review.",
    },
    { key: "email", label: "Reviewer Email", type: "string", required: true },
    { key: "name", label: "Reviewer Name", type: "string", required: true },
    {
      key: "reviewerNameFormat",
      label: "Reviewer Name Format",
      type: "select",
      options: [
        { value: "", label: "Full name (default)" },
        { value: "last_initial", label: "Last initial (e.g. John S.)" },
        { value: "all_initials", label: "All initials (e.g. J.S.)" },
        { value: "anonymous", label: "Anonymous" },
      ],
      advanced: true,
    },
    {
      key: "rating",
      label: "Rating",
      type: "select",
      required: true,
      options: [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
    },
    { key: "title", label: "Review Title", type: "string", advanced: true },
    { key: "body", label: "Review Body", type: "text", required: true },
    {
      key: "cfAnswers",
      label: "Custom Form Answers",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          { key: "cf_question_id", label: "Question ID", type: "number", required: true },
          { key: "value", label: "Answer", type: "string", required: true },
        ],
      },
      hint: "Answers to the shop's custom review-form questions.",
    },
    {
      key: "pictureUrls",
      label: "Picture URLs",
      type: "array",
      advanced: true,
      item: { type: "string" },
    },
    {
      key: "ipAddr",
      label: "Reviewer IP Address",
      type: "string",
      advanced: true,
      hint: "If blank, Judge.me uses the IP address that makes this API request.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Raw response body (shape undocumented by Judge.me)" },
  ],

  async execute(input, ctx) {
    const result = await new JudgeMeClient(ctx).json<Record<string, unknown>>("/reviews", {
      method: "POST",
      body: compact({
        shop_domain: input.shopDomain,
        platform: input.platform,
        id: input.productExternalId,
        email: input.email,
        name: input.name,
        reviewer_name_format: input.reviewerNameFormat,
        rating: input.rating,
        title: input.title,
        body: input.body,
        cf_answers: input.cfAnswers,
        picture_urls: input.pictureUrls,
        ip_addr: input.ipAddr,
      }),
    });
    return { result };
  },
};

export default createReview;
