import { v7 as uuidv7 } from 'uuid';

export function generateEntityId() {
  return uuidv7();
}
