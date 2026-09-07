export class StorageObjectNotFoundError extends Error {
  constructor() {
    super('Storage object was not found');
    this.name = 'StorageObjectNotFoundError';
  }
}

export class StorageProviderError extends Error {
  constructor() {
    super('Storage provider is unavailable');
    this.name = 'StorageProviderError';
  }
}

export function createUnavailableApplicationStorage() {
  const unavailable = async () => {
    throw new StorageProviderError();
  };
  return {
    createSignedPutUrl: unavailable,
    createSignedGetUrl: unavailable,
    headObject: unavailable,
  };
}
