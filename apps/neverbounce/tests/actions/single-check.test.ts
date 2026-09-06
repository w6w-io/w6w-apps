import { assertEquals, assertRejects } from "@std/assert";
import singleCheck from "../../actions/single-check.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("single-check: builds the query string and returns the parsed body", async () => {
  const body = {
    status: "success",
    result: "valid",
    flags: ["has_dns", "has_dns_mx"],
    suggested_correction: "",
    execution_time: 499,
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await singleCheck.execute({ email: "support@neverbounce.com" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4.2/single/check");
  assertEquals(url.searchParams.get("email"), "support@neverbounce.com");
  assertEquals(url.searchParams.has("address_info"), false);
  assertEquals(url.searchParams.has("credits_info"), false);
  assertEquals(result, body);
});

Deno.test("single-check: address_info/credits_info booleans become 1", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: "success", result: "valid", execution_time: 1 } },
  ]);

  await singleCheck.execute(
    { email: "a@b.com", addressInfo: true, creditsInfo: true, timeout: 10 },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("address_info"), "1");
  assertEquals(url.searchParams.get("credits_info"), "1");
  assertEquals(url.searchParams.get("timeout"), "10");
});

Deno.test("single-check: throws on a non-success status, per NeverBounce's error-in-200 shape", async () => {
  const { ctx } = mockCtx([
    { body: { status: "auth_failure", message: "Invalid API Key", execution_time: 1 } },
  ]);

  await assertRejects(
    async () => {
      await singleCheck.execute({ email: "a@b.com" }, ctx);
    },
    Error,
    "auth_failure",
  );
});
