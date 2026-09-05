import { assertEquals } from "@std/assert";
import createPerson from "../../actions/create-person.ts";
import { bodyOf, mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("create-person: POSTs the JSON-API envelope with the given attributes", async () => {
  const { ctx, calls } = mockCtx([
    { body: single("Person", "9", { first_name: "New", last_name: "Person", name: "New Person" }) },
  ]);
  const out = await createPerson.execute({ firstName: "New", lastName: "Person" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/people/v2/people");
  // `JSON.stringify` drops `undefined` values — `birthdate`/`gender` are absent
  // from the wire body entirely rather than sent as JSON `null`.
  assertEquals(bodyOf(calls[0]), {
    data: {
      type: "Person",
      attributes: { first_name: "New", last_name: "Person" },
    },
  });
  assertEquals(out, { id: "9", firstName: "New", lastName: "Person", name: "New Person" });
});

Deno.test("create-person: is declared non-idempotent", () => {
  assertEquals(createPerson.idempotent, false);
});

Deno.test("create-person: requires firstName", () => {
  const firstName = createPerson.params?.find((p) => p.key === "firstName");
  assertEquals(firstName?.required, true);
});
