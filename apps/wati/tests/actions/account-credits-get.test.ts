import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-credits-get.ts";

const conn = { display: { baseUrl: "https://live-mt-server.wati.io/12345" } };

Deno.test("account-credits-get: GETs /account/credits and returns the balance verbatim", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { credit: 42.5, welcome_credit: 0, currency: "USD" } }],
    conn,
  );
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://live-mt-server.wati.io/12345/api/ext/v3/account/credits");
  assertEquals(out, { credit: 42.5, welcome_credit: 0, currency: "USD" });
});
