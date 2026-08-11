import { assert, assertEquals } from "@std/assert";
import clientGet from "../../actions/client-get.ts";
import { API_PATH, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The vendor's own published example response for this endpoint, verbatim —
 * including the `ApiKey` field, which is a working client-scoped credential.
 */
const VENDOR_EXAMPLE = {
  ApiKey: "639d8cc27198202f5fe6037a8b17a29a59984b86d3289bc9",
  BasicDetails: {
    ClientID: "4a397ccaaa55eb4e6aa1221e1e2d7122",
    CompanyName: "Client One",
    Country: "Australia",
    TimeZone: "(GMT+10:00) Canberra, Melbourne, Sydney",
    PrimaryContactName: "Sally",
    PrimaryContactEmail: "sally@example.com",
  },
  BillingDetails: { CanPurchaseCredits: true, Credits: 500, Currency: "USD" },
};

Deno.test("client-get: GETs the client-level /clients/{clientid}.json", async () => {
  const { ctx, calls } = mockCtx([{ body: VENDOR_EXAMPLE }]);
  await clientGet.execute({ clientId: "4a397ccaaa55eb4e6aa1221e1e2d7122" }, ctx);
  assertEquals(
    pathOf(calls[0].url),
    `${API_PATH}/clients/4a397ccaaa55eb4e6aa1221e1e2d7122.json`,
  );
});

/**
 * THE defect this action exists to prevent. The assertion is over the whole
 * serialized result, not over one field name: a future refactor that nests the
 * client object one level deeper would keep `out.ApiKey === undefined` true
 * while still shipping the secret.
 */
Deno.test("client-get: the client's own key never appears anywhere in the result", async () => {
  const { ctx } = mockCtx([{ body: VENDOR_EXAMPLE }]);
  const out = await clientGet.execute({ clientId: "4a397ccaaa55eb4e6aa1221e1e2d7122" }, ctx);

  assert(
    !JSON.stringify(out).includes(VENDOR_EXAMPLE.ApiKey),
    "the client's API key survived into the action result",
  );
  assertEquals((out as Record<string, unknown>).ApiKey, undefined);
  // Deleted, not masked: a placeholder in a field named ApiKey reads like a value.
  assert(
    !("ApiKey" in (out as Record<string, unknown>)),
    "the field was masked rather than deleted",
  );
});

Deno.test("client-get: everything that is not the secret is passed through untouched", async () => {
  const { ctx } = mockCtx([{ body: VENDOR_EXAMPLE }]);
  const out = await clientGet.execute({ clientId: "4a397ccaaa55eb4e6aa1221e1e2d7122" }, ctx);
  assertEquals(
    (out as Record<string, unknown>).BasicDetails,
    VENDOR_EXAMPLE.BasicDetails,
  );
  assertEquals(
    (out as Record<string, unknown>).BillingDetails,
    VENDOR_EXAMPLE.BillingDetails,
  );
});

Deno.test("client-get: a slash pasted into the client id cannot rewrite the path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await clientGet.execute({ clientId: "abc/../../admins" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/abc%2F..%2F..%2Fadmins.json`);
});
