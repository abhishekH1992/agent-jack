export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const GRAPHQL_URL = `${API_URL}/graphql`;

export const CLERK_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);
