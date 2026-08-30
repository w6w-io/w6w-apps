import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  jsonArg,
  jsonArrayArg,
  unwrap,
  unwrapBusiness,
  WaveClient,
} from "../../lib/client.ts";

Deno.test("compact: drops undefined, null, empty string, empty array/object", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: {}, g: false, h: 0 }),
    { a: 1, g: false, h: 0 },
  );
});

Deno.test("csv: splits and trims, or leaves unset", () => {
  assertEquals(csv("a@b.com, c@d.com"), ["a@b.com", "c@d.com"]);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(""), undefined);
});

Deno.test("jsonArg: parses a JSON object string, passes through an object, rejects an array", () => {
  assertEquals(jsonArg('{"a":1}', "f"), { a: 1 });
  assertEquals(jsonArg({ a: 1 }, "f"), { a: 1 });
  assertEquals(jsonArg(undefined, "f"), undefined);
  let threw = false;
  try {
    jsonArg("[1,2]", "f");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("f"));
  }
  assert(threw);
});

Deno.test("jsonArrayArg: parses a JSON array string, passes through an array, rejects an object", () => {
  assertEquals(jsonArrayArg("[1,2]", "f"), [1, 2]);
  assertEquals(jsonArrayArg([1, 2], "f"), [1, 2]);
  assertEquals(jsonArrayArg(undefined, "f"), undefined);
  let threw = false;
  try {
    jsonArrayArg('{"a":1}', "f");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("f"));
  }
  assert(threw);
});

Deno.test("WaveClient.send: posts to the single GraphQL endpoint with no version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { user: { id: "u1" } } } }]);
  await new WaveClient(ctx).send("{ user { id } }");
  assertEquals(calls[0].url, "https://gql.waveapps.com/graphql/public");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assert(!("authorization" in calls[0].headers), "client must not set Authorization itself");
  assert(!("x-jobber-graphql-version" in calls[0].headers));
});

Deno.test("WaveClient.send: throws on transport-level errors[]", async () => {
  const { ctx } = mockCtx([{
    body: {
      errors: [{ message: "Login required.", extensions: { code: "UNAUTHENTICATED" } }],
      data: { user: null },
    },
  }]);
  await assertRejects(
    () => new WaveClient(ctx).send("{ user { id } }"),
    Error,
    "Login required",
  );
});

Deno.test("WaveClient.send: throws on a non-2xx with no errors[]", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Internal", body: "oops" }]);
  await assertRejects(() => new WaveClient(ctx).send("{ user { id } }"), Error, "500");
});

Deno.test("WaveClient.send: throws on non-JSON body", async () => {
  const { ctx } = mockCtx([{
    body: "<html>not json</html>",
    headers: { "content-type": "text/html" },
  }]);
  await assertRejects(() => new WaveClient(ctx).send("{ user { id } }"), Error, "non-JSON");
});

Deno.test("WaveClient.query: returns the validated data object", async () => {
  const { ctx } = mockCtx([{ body: { data: { user: { id: "u1" } } } }]);
  const data = await new WaveClient(ctx).query<{ user: { id: string } }>("{ user { id } }");
  assertEquals(data.user.id, "u1");
});

Deno.test("unwrap: returns the payload when didSucceed is true and inputErrors is empty", () => {
  const data = { customerCreate: { didSucceed: true, inputErrors: [], customer: { id: "c1" } } };
  const out = unwrap<{ customer: { id: string } }>(data, "customerCreate");
  assertEquals(out.customer.id, "c1");
});

Deno.test("unwrap: throws on didSucceed: false with inputErrors detail", () => {
  const data = {
    customerCreate: {
      didSucceed: false,
      inputErrors: [{
        code: "REQUIRED",
        message: "This field is required.",
        path: ["input", "name"],
      }],
      customer: null,
    },
  };
  let threw = false;
  try {
    unwrap(data, "customerCreate");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("input.name"));
    assert((e as Error).message.includes("This field is required."));
  }
  assert(threw);
});

Deno.test("unwrap: throws when the field is entirely missing", () => {
  let threw = false;
  try {
    unwrap({}, "customerCreate");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("customerCreate"));
  }
  assert(threw);
});

Deno.test("unwrapBusiness: reaches into data.business.<field>", () => {
  const data = { business: { customers: { edges: [] } } };
  assertEquals(unwrapBusiness(data, "customers"), { edges: [] });
});

Deno.test("unwrapBusiness: throws when business is null (bad businessId)", () => {
  let threw = false;
  try {
    unwrapBusiness({ business: null }, "customers");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("business"));
  }
  assert(threw);
});
