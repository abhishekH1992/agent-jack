"use client";

import { gql } from "@/lib/graphql";

/** Admin GraphQL helper — sends role header for local/dev without Clerk. */
export async function adminGql<T>(
  query: string,
  variables?: Record<string, unknown>,
) {
  return gql<T>(query, variables, { "x-clerk-role": "admin" });
}
