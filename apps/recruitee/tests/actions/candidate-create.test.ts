import { assertEquals } from "@std/assert";
import candidateCreate from "../../actions/candidate-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-create: nests fields under `candidate`, keeps `offers` a sibling", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { candidate: { id: 1 }, references: [] } }]);
  await candidateCreate.execute({
    name: "Jane Doe",
    emails: ["jane@example.com"],
    phones: ["+1234567890"],
    customFields: [{ label: "Pets", values: ["Cats", "Dogs"] }],
    offerIds: [5, 6],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/c/123/candidates");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    candidate: {
      name: "Jane Doe",
      emails: ["jane@example.com"],
      phones: ["+1234567890"],
      custom_fields: [{ label: "Pets", values: ["Cats", "Dogs"] }],
    },
    offers: [5, 6],
  });
});

Deno.test("candidate-create: is declared not idempotent — retries can create duplicates", () => {
  assertEquals(candidateCreate.idempotent, false);
});
