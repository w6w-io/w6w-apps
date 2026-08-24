import { assertEquals, assertRejects } from "@std/assert";
import robotCookiesSet from "../../actions/robot-cookies-set.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

const COOKIES = [{ name: "session", value: "abc123", domain: ".example.com" }];

Deno.test("robot-cookies-set: PATCHes the cookies array as the raw body, not wrapped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("cookies", COOKIES) }]);
  const out = await robotCookiesSet.execute(
    { robotId: "r1", cookies: COOKIES },
    ctx,
  ) as { cookies: typeof COOKIES };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/cookies");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), COOKIES);
  assertEquals(out.cookies, COOKIES);
});

Deno.test("robot-cookies-set: accepts the string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("cookies", COOKIES) }]);
  await robotCookiesSet.execute({ robotId: "r1", cookies: JSON.stringify(COOKIES) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), COOKIES);
});

Deno.test("robot-cookies-set: malformed JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await robotCookiesSet.execute({ robotId: "r1", cookies: "{not json" }, ctx),
    Error,
    "Cookies is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("robot-cookies-set: missing cookies fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await robotCookiesSet.execute({ robotId: "r1", cookies: undefined }, ctx),
    Error,
    "Cookies is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("robot-cookies-set: is declared idempotent — a PATCH fully replaces the cookie set", () => {
  assertEquals(robotCookiesSet.idempotent, true);
});
