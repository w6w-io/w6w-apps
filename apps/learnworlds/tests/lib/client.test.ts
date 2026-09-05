import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  errorMessage,
  LearnWorldsClient,
  normalizeSchoolDomain,
  schoolOriginFromConnection,
} from "../../lib/client.ts";

Deno.test("normalizeSchoolDomain: adds https when no scheme is given", () => {
  assertEquals(
    normalizeSchoolDomain("yourschool.learnworlds.com"),
    "https://yourschool.learnworlds.com",
  );
});

Deno.test("normalizeSchoolDomain: keeps an explicit scheme and drops a trailing path", () => {
  assertEquals(
    normalizeSchoolDomain("https://yourschool.learnworlds.com/"),
    "https://yourschool.learnworlds.com",
  );
  assertEquals(
    normalizeSchoolDomain("https://yourschool.learnworlds.com/admin/api"),
    "https://yourschool.learnworlds.com",
  );
});

Deno.test("normalizeSchoolDomain: a fully custom domain is accepted as-is", () => {
  assertEquals(normalizeSchoolDomain("courses.acme.com"), "https://courses.acme.com");
});

Deno.test("normalizeSchoolDomain: rejects an empty or invalid domain", () => {
  assertThrows(() => normalizeSchoolDomain(""), Error, "empty");
  assertThrows(() => normalizeSchoolDomain("::::"), Error);
});

Deno.test("schoolOriginFromConnection: reads the connection's schoolDomain", () => {
  const { ctx } = mockCtx([], { display: { schoolDomain: "yourschool.learnworlds.com" } });
  assertEquals(schoolOriginFromConnection(ctx.connection), "https://yourschool.learnworlds.com");
});

Deno.test("schoolOriginFromConnection: throws a reconnect message when there is no domain", () => {
  assertThrows(() => schoolOriginFromConnection(undefined), Error, "records no school domain");
});

Deno.test("compact: drops undefined, null, empty string and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "x", g: [1] }),
    { a: 1, f: "x", g: [1] },
  );
});

Deno.test("csv: splits a comma-separated string and trims", () => {
  assertEquals(csv(" a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
});

Deno.test("errorMessage: reads the documented {errors:[{code,context,message}]} envelope", () => {
  const msg = errorMessage(
    JSON.stringify({
      errors: [{ code: 400, context: "client_id", message: "Missing client_id" }],
      success: false,
    }),
  );
  assertEquals(msg, "Missing client_id");
});

Deno.test("errorMessage: joins multiple errors", () => {
  const msg = errorMessage(
    JSON.stringify({
      errors: [{ message: "first" }, { message: "second" }],
      success: false,
    }),
  );
  assertEquals(msg, "first; second");
});

Deno.test("errorMessage: reads the bare {error: string} envelope", () => {
  assertEquals(
    errorMessage(JSON.stringify({ error: "Sorry the resource does not exist." })),
    "Sorry the resource does not exist.",
  );
});

Deno.test("errorMessage: falls back to the raw text when it is not JSON", () => {
  assertEquals(errorMessage("<html>nope</html>"), "<html>nope</html>");
  assertEquals(errorMessage(""), "");
});

const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };

Deno.test("LearnWorldsClient.request: builds the URL under /admin/api and forwards query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  const client = new LearnWorldsClient(ctx);
  await client.request("/v2/courses", { query: { page: 2, empty: undefined } });
  assertEquals(
    calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/courses?page=2",
  );
});

Deno.test("LearnWorldsClient.request: never sets authorization or Lw-Client itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await new LearnWorldsClient(ctx).request("/v2/courses");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["lw-client"], undefined);
});

Deno.test("LearnWorldsClient.request: throws a message carrying the LearnWorlds error envelope", async () => {
  const { ctx } = mockCtx(
    [{
      status: 400,
      body: {
        errors: [{
          code: 400,
          context: "client_id",
          message: "Missing client_id or client cannot be found.",
        }],
        success: false,
      },
    }],
    conn,
  );
  const client = new LearnWorldsClient(ctx);
  let threw = false;
  try {
    await client.request("/v2/courses");
  } catch (err) {
    threw = true;
    assert(
      (err as Error).message.includes("Missing client_id or client cannot be found."),
      (err as Error).message,
    );
  }
  assert(threw, "expected request() to throw");
});

Deno.test("LearnWorldsClient.request: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }], conn);
  const result = await new LearnWorldsClient(ctx).request("/v2/users/1/enrollment", {
    method: "DELETE",
  });
  assertEquals(result, undefined);
});
