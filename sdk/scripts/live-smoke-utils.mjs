export async function runSearchSmoke({ searchRecent, query }) {
  const result = await searchRecent({ query, limit: 5 });
  if (!result?.ok) {
    throw new Error(`search.recent failed: ${result?.summary ?? JSON.stringify(result)}`);
  }
  if (!Array.isArray(result.data)) {
    throw new Error("search.recent returned no data array");
  }
  return result;
}

export function selectDmRecipient(users, selfId) {
  return users.find((user) =>
    user.id !== selfId &&
    Boolean(user.email) &&
    user.status === "ACTIVATED" &&
    user.role !== "GUEST" &&
    !user.isPumbleBot &&
    !user.isAddonBot
  );
}
