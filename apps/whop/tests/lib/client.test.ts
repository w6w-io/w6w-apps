import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_VERSION_DATE,
  asOptionalJson,
  compact,
  formatWhopError,
  idempotencyHeaders,
  requireAccountId,
  resolveAccountId,
  stripPaymentSecret,
  toList,
  truncate,
  WhopClient,
} from "../../lib/client.ts";
import { errorBody, mockCtx, mockCtxWithAccount, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("toList: normalises array, comma-string, and empty forms", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes through an object, rejects garbage", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "x")?.a, 1);
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a labeled error for malformed JSON", () => {
  try {
    asOptionalJson("{not json", "metadata");
    throw new Error("expected to throw");
  } catch (e) {
    assert(e instanceof Error);
    assertEquals((e as Error).message, "metadata is not valid JSON");
  }
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("formatWhopError: keeps type, code, param and message verbatim", () => {
  const msg = formatWhopError(
    400,
    "POST",
    "/promo_codes",
    JSON.stringify(
      errorBody("invalid_request_error", "amount_off is required", { param: "amount_off" }),
    ),
  );
  assert(msg.includes("400"));
  assert(msg.includes("invalid_request_error"));
  assert(msg.includes("param=amount_off"));
  assert(msg.includes("amount_off is required"));
});

Deno.test("formatWhopError: falls back to the raw body when it is not JSON", () => {
  const msg = formatWhopError(502, "GET", "/memberships", "<html>Bad Gateway</html>");
  assert(msg.includes("502"));
  assert(msg.includes("<html>Bad Gateway</html>"));
});

Deno.test("idempotencyHeaders: uses invocationId when present, omits the header otherwise", () => {
  assertEquals(
    idempotencyHeaders({ invocation: { invocationId: "inv-1", trigger: "run" } } as never),
    { "Idempotency-Key": "inv-1" },
  );
  assertEquals(idempotencyHeaders({} as never), {});
});

Deno.test("resolveAccountId: explicit wins, then connection display, then undefined", () => {
  const withDisplay = { connection: { display: { accountId: "biz_conn" } } } as never;
  assertEquals(resolveAccountId("biz_explicit", withDisplay), "biz_explicit");
  assertEquals(resolveAccountId(undefined, withDisplay), "biz_conn");
  assertEquals(resolveAccountId(undefined, {} as never), undefined);
});

Deno.test("requireAccountId: throws with neither source set", () => {
  try {
    requireAccountId(undefined, {} as never);
    throw new Error("expected to throw");
  } catch (e) {
    assert(e instanceof Error);
    assert((e as Error).message.includes("accountId is required"));
  }
});

Deno.test("stripPaymentSecret: removes client_secret, keeps everything else", () => {
  assertEquals(
    stripPaymentSecret<Record<string, unknown>>({ id: "pay_1", client_secret: "s", amount: 10 }),
    { id: "pay_1", amount: 10 },
  );
  // Non-objects pass through unchanged.
  assertEquals(stripPaymentSecret(null), null);
  assertEquals(stripPaymentSecret([1, 2]), [1, 2]);
});

Deno.test("WhopClient: pins Api-Version-Date and content-type on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new WhopClient(ctx).post("/memberships/mem_1/cancel", { cancel_at_period_end: true });
  assertEquals(calls[0].headers["api-version-date"], API_VERSION_DATE);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("WhopClient: bracket array style is the default", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new WhopClient(ctx).get("/memberships", { product_ids: ["a", "b"] });
  assertEquals(queryOf(calls[0].url)["product_ids[]"], ["a", "b"]);
});

Deno.test("WhopClient: repeat array style omits the brackets", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new WhopClient(ctx).get("/payments", { statuses: ["paid", "refunded"] }, "repeat");
  assertEquals(queryOf(calls[0].url).statuses, ["paid", "refunded"]);
});

Deno.test("WhopClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("unauthorized", "Authentication failed"),
  }]);
  await assertRejects(
    async () => await new WhopClient(ctx).get("/memberships"),
    Error,
    "unauthorized",
  );
});

Deno.test("WhopClient: a 204/empty body returns undefined rather than throwing on parse", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new WhopClient(ctx).delete("/webhooks/hook_1");
  assertEquals(out, undefined);
});

Deno.test("WhopClient: DELETE and GET never send Idempotency-Key even with one available", async () => {
  const { ctx, calls } = mockCtxWithAccount([{ body: { data: [] } }]);
  await new WhopClient(ctx).get("/memberships");
  assertEquals(calls[0].headers["idempotency-key"], undefined);
});

Deno.test("WhopClient: builds the expected pathname for a nested resource route", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new WhopClient(ctx).get("/users/user_1/access/prod_1");
  assertEquals(pathOf(calls[0].url), "/users/user_1/access/prod_1");
});
