import { assert, assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

/**
 * `GET /v2/users/me` returns `proxy.password` — the account's **Apify Proxy
 * password**, a live credential for `proxy.apify.com` handed to any caller
 * holding the API token, inside what reads like an ordinary profile lookup.
 *
 * A workflow step's result is persisted in the run record and echoed into logs
 * and previews, so returning it would copy a working credential into durable
 * storage on every call. This is the assertion that keeps it out.
 */
Deno.test("account-get: the Apify Proxy password never reaches the caller", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "u1",
        username: "acme",
        email: "ops@acme.example",
        isPaying: true,
        proxy: { password: "proxy-password-do-not-leak", groups: [{ name: "RESIDENTIAL" }] },
      }),
    },
  ]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assert(
    !JSON.stringify(out).includes("proxy-password-do-not-leak"),
    "the proxy password survived somewhere in the result",
  );
  assertEquals("password" in (out.proxy as Record<string, unknown>), false);
  // The strip is narrow: the non-secret half of `proxy` is kept, as is the rest
  // of the profile. Scrubbing more would break the reason to call this at all.
  assertEquals((out.proxy as { groups: unknown }).groups, [{ name: "RESIDENTIAL" }]);
  assertEquals(out.username, "acme");
  assertEquals(out.email, "ops@acme.example");
  assertEquals(out.isPaying, true);
});

Deno.test("account-get: a response without a proxy block is passed through unchanged", async () => {
  const { ctx } = mockCtx([{ body: envelope({ id: "u1", username: "acme" }) }]);
  const out = await accountGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out, { id: "u1", username: "acme" });
});

Deno.test("account-get: takes no parameters", () => {
  assertEquals(accountGet.params?.length, 0);
});
