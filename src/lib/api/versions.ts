// The newest version seen for each character, which PATCH has to send back. Play actions bump it
// too, and answer with a sheet rather than a character, so it's tracked apart from the query cache.
const versions = new Map<string, number>();

export const getVersion = (id: string) => versions.get(id);

// Keeps the highest, as replies can arrive out of order.
export function noteVersion(id: string, version: number) {
  if (version > (versions.get(id) ?? 0)) versions.set(id, version);
}

export const forgetVersion = (id: string) => {
  versions.delete(id);
};

export const clearVersions = () => {
  versions.clear();
};
