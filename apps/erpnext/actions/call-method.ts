import type { ActionDefinition } from "@w6w/types";
import { ErpNextClient, json } from "../lib/client.ts";

interface Input {
  method: string;
  httpMethod: "GET" | "POST";
  args?: unknown;
}

/**
 * `GET|POST /api/method/:dotted.path` — call any whitelisted Frappe method.
 *
 * ## Why this belongs in the app
 *
 * The generic document CRUD actions cover a DocType's own fields, but
 * ERPNext's real business operations — posting a Payment Entry against an
 * Invoice, running `erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice`,
 * or a custom app's own whitelisted method — are Python functions, not
 * fields. Frappe's docs are explicit that any such method is reachable at
 * `/api/method/<dotted.path>` once it carries `@frappe.whitelist()`. Without
 * this action, the honest description of this app would be "ERPNext, but
 * only generic CRUD"; with it, the named actions are ergonomic shortcuts
 * rather than a ceiling.
 *
 * ## What it does NOT do
 *
 * It reaches nothing the connected User could not already reach directly: a
 * method Frappe has not whitelisted, or one the User's roles do not permit,
 * is refused by the framework itself (per the docs, "these methods must be
 * marked as whitelisted to make them accessible via REST").
 *
 * ## GET vs POST — the docs' own rule
 *
 * "If your method returns some values, you should send a `GET` request. If
 * your method changes the state of the database, use `POST`." This action
 * takes that choice explicitly rather than guessing from the method name.
 *
 * `idempotent: false` — the only honest answer. The method is chosen at
 * runtime, so this action cannot know whether it is read-only or not.
 */
const callMethod: ActionDefinition<Input> = {
  key: "call-method",
  type: "perform",
  title: "Call Method",
  description: "Call any whitelisted Frappe/ERPNext method directly, for business logic no " +
    "generic document action reaches — e.g. `frappe.client.get_list`, or a method a custom app " +
    "adds. Runs with exactly the connected User's permissions.",
  idempotent: false,
  params: [
    {
      key: "method",
      label: "Method",
      type: "string",
      required: true,
      placeholder: "frappe.client.get_count",
      hint: "The whitelisted method's dotted Python path.",
    },
    {
      key: "httpMethod",
      label: "HTTP Method",
      type: "select",
      required: true,
      default: "GET",
      options: [
        { value: "GET", label: "GET — the method only returns values" },
        { value: "POST", label: "POST — the method changes data" },
      ],
    },
    {
      key: "args",
      label: "Arguments",
      type: "json",
      default: {},
      hint: 'JSON object of the method\'s keyword arguments, e.g. `{"doctype": "Customer"}`.',
    },
  ],
  output: [{
    key: "result",
    type: "object",
    label: "Whatever the method returned — any JSON value, shape depends on the method",
  }],

  async execute(input, ctx) {
    const args = json(input.args, "Arguments") ?? {};
    if (typeof args !== "object" || args === null || Array.isArray(args)) {
      throw new Error("Arguments must be a JSON object.");
    }
    const httpMethod = input.httpMethod === "POST" ? "POST" : "GET";

    const result = await new ErpNextClient(ctx).method<unknown>(input.method, {
      method: httpMethod,
      // A GET carries no body, so its arguments travel as query parameters —
      // Frappe's dispatcher reads whitelisted-method kwargs from either place.
      query: httpMethod === "GET" ? (args as Record<string, unknown>) : undefined,
      body: httpMethod === "POST" ? args : undefined,
    });
    return { result };
  },
};

export default callMethod;
