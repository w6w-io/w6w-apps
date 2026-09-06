import { assertEquals } from "@std/assert";
import { buildPartyBody } from "../../lib/party.ts";

Deno.test("buildPartyBody: person fields", () => {
  assertEquals(
    buildPartyBody({ type: "person", firstName: "Scott", lastName: "Spacey", jobTitle: "CD" }),
    { type: "person", firstName: "Scott", lastName: "Spacey", jobTitle: "CD" },
  );
});

Deno.test("buildPartyBody: organisation name and about", () => {
  assertEquals(
    buildPartyBody({ type: "organisation", name: "Acme", about: "A widget maker" }),
    { type: "organisation", name: "Acme", about: "A widget maker" },
  );
});

Deno.test("buildPartyBody: links to an existing organisation by id", () => {
  assertEquals(
    buildPartyBody({ firstName: "Jo", organisationId: 42 }),
    { firstName: "Jo", organisation: { id: 42 } },
  );
});

Deno.test("buildPartyBody: organisationId takes precedence over organisationName", () => {
  assertEquals(
    buildPartyBody({ organisationId: 42, organisationName: "Ignored" }),
    { organisation: { id: 42 } },
  );
});

Deno.test("buildPartyBody: falls back to organisationName when no id is given", () => {
  assertEquals(buildPartyBody({ organisationName: "Acme" }), { organisation: { name: "Acme" } });
});

Deno.test("buildPartyBody: owner/team nest as {id}", () => {
  assertEquals(buildPartyBody({ ownerId: 1, teamId: 2 }), { owner: { id: 1 }, team: { id: 2 } });
});

Deno.test("buildPartyBody: a single email/phone convenience nests as one-element arrays", () => {
  assertEquals(
    buildPartyBody({ email: "jo@acme.test", phone: "555-1234" }),
    { emailAddresses: [{ address: "jo@acme.test" }], phoneNumbers: [{ number: "555-1234" }] },
  );
});

Deno.test("buildPartyBody: blank strings are dropped, not sent as empty updates", () => {
  assertEquals(buildPartyBody({ firstName: "", about: "" }), {});
});

Deno.test("buildPartyBody: unset optional fields are omitted entirely (PUT-safe)", () => {
  assertEquals(buildPartyBody({}), {});
});
