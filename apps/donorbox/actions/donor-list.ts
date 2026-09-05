import type { ActionDefinition } from "@w6w/types";
import { DonorboxClient } from "../lib/client.ts";
import { compact, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  id?: number;
  first_name?: string;
  last_name?: string;
  donor_name?: string;
  email?: string;
  page?: number;
  per_page?: number;
  order?: string;
}

/** `GET /api/v1/donors`. */
const donorList: ActionDefinition<Input> = {
  key: "donor-list",
  type: "search",
  resource: "donor",
  title: "List Donors",
  description: "List donors on the connected Donorbox organization.",
  params: [
    {
      key: "id",
      label: "Donor ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "The Donorbox-generated donor id.",
    },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    {
      key: "donor_name",
      label: "Full name",
      type: "string",
      hint: 'Equivalent to setting first + last name together, e.g. "Jane Doe".',
    },
    { key: "email", label: "Email", type: "string" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Donors" },
  ],

  async execute(input, ctx) {
    const data = await new DonorboxClient(ctx).list("/donors", {
      query: compact({
        id: input.id,
        first_name: input.first_name,
        last_name: input.last_name,
        donor_name: input.donor_name,
        email: input.email,
        ...paginationQuery(input),
      }),
    });
    return { data };
  },
};

export default donorList;
