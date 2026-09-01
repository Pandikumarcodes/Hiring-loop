export function createInMemoryRepository() {
  let nextId = 1;

  return {
    save: async ({ name }) => ({
      id: `fixture-${nextId++}`,
      name,
    }),
  };
}
