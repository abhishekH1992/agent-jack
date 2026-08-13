import { GRAPHQL_URL } from "./config";

type GqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<T> {
  if (!query?.trim()) {
    throw new Error("GraphQL query is missing");
  }

  const payload: Record<string, unknown> = { query };
  if (variables && Object.keys(variables).length > 0) {
    payload.variables = variables;
  }

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Apollo-Require-Preflight": "true",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await res.json()) as GqlResponse<T>;
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) {
    throw new Error("No data returned");
  }
  return json.data;
}

