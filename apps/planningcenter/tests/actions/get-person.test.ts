import { assertEquals } from "@std/assert";
import getPerson from "../../actions/get-person.ts";
import { mockCtx, pathOf, queryOf, single } from "../_helpers.ts";

Deno.test("get-person: calls GET /people/v2/people/{id}?include=emails", async () => {
  const { ctx, calls } = mockCtx([
    { body: single("Person", "42", { first_name: "Jane", last_name: "Doe", name: "Jane Doe" }) },
  ]);
  await getPerson.execute({ personId: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/people/v2/people/42");
  assertEquals(queryOf(calls[0].url)["include"], "emails");
});

Deno.test("get-person: prefers the email flagged primary:true over the first one", async () => {
  const { ctx } = mockCtx([
    {
      body: single(
        "Person",
        "42",
        { first_name: "Jane" },
        {
          included: [
            { type: "Email", id: "e1", attributes: { address: "old@example.com", primary: false } },
            { type: "Email", id: "e2", attributes: { address: "new@example.com", primary: true } },
          ],
        },
      ),
    },
  ]);
  const out = await getPerson.execute({ personId: "42" }, ctx);

  assertEquals(out.email, "new@example.com");
});

Deno.test("get-person: falls back to the first email when none is flagged primary", async () => {
  const { ctx } = mockCtx([
    {
      body: single(
        "Person",
        "42",
        { first_name: "Jane" },
        { included: [{ type: "Email", id: "e1", attributes: { address: "only@example.com" } }] },
      ),
    },
  ]);
  const out = await getPerson.execute({ personId: "42" }, ctx);

  assertEquals(out.email, "only@example.com");
});

Deno.test("get-person: no included emails leaves email undefined, never throws", async () => {
  const { ctx } = mockCtx([{ body: single("Person", "42", { first_name: "Jane" }) }]);
  const out = await getPerson.execute({ personId: "42" }, ctx);

  assertEquals(out.email, undefined);
});

Deno.test("get-person: percent-encodes the person id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: single("Person", "1", {}) }]);
  await getPerson.execute({ personId: "abc/def" }, ctx);

  assertEquals(pathOf(calls[0].url), "/people/v2/people/abc%2Fdef");
});
