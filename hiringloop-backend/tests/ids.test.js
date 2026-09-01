import { describe, expect, it } from 'vitest';
import { validate as validateUuid } from 'uuid';

import { generateEntityId } from '../src/utils/ids.js';

describe('generateEntityId', () => {
  it('generates a standards-compliant UUIDv7', () => {
    const id = generateEntityId();

    expect(validateUuid(id)).toBe(true);
    expect(id[14]).toBe('7');
  });
});
