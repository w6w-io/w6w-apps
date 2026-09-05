import { assert, assertEquals } from "@std/assert";
import basic from "../../auth/basic.ts";
import { BASE_URL, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("basic: sign stamps a Basic header built from username:password", () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = basic.sign!(
    { request, credential: { baseUrl: BASE_URL, username: "jdoe", password: "hunter2" } },
    // deno-lint-ignore no-explicit-any
    {} as any,
  ) as typeof request;
  assertEquals(out.headers["authorization"], `Basic ${btoa("jdoe:hunter2")}`);
});

Deno.test("basic: test() calls /myself with Basic auth and passes on a named user", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "jdoe", displayName: "Jane Doe" } }]);
  const result = await basic.test(
    { credential: { baseUrl: BASE_URL, username: "jdoe", password: "hunter2" } },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/rest/api/2/myself");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("jdoe:hunter2")}`);
  assertEquals(result.ok, true);
});

Deno.test("basic: test() fails on a 401 without leaking the password in the message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errorMessages: ["Login required"] } }]);
  const result = await basic.test(
    { credential: { baseUrl: BASE_URL, username: "jdoe", password: "hunter2" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(!result.message?.includes("hunter2"));
});
