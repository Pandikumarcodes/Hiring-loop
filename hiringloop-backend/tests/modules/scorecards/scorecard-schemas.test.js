import { describe, expect, it } from 'vitest';
import {
  noteCreateBody,
  scorecardBody,
  templateUpdateBody,
} from '../../../src/modules/scorecards/schemas/scorecard-schemas.js';

const id = '018f47c1-2c38-7cc2-8e7f-123456789abc';

describe('scorecard request schemas', () => {
  it('rejects ratings outside the fixed 1 through 5 scale', () => {
    expect(
      scorecardBody.safeParse({
        responses: [{ criterionId: id, ratingValue: 0 }],
      }).success,
    ).toBe(false);
    expect(
      scorecardBody.safeParse({
        responses: [{ criterionId: id, ratingValue: 6 }],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate criteria and positions in template drafts', () => {
    expect(
      templateUpdateBody.safeParse({
        expectedRevision: 1,
        title: 'Interview',
        criteria: [
          { label: 'A', type: 'RATING', required: true, position: 1 },
          { label: 'B', type: 'TEXT', required: false, position: 1 },
        ],
      }).success,
    ).toBe(false);
  });

  it('trims and requires plain-text note content', () => {
    expect(noteCreateBody.safeParse({ body: '   ' }).success).toBe(false);
    expect(noteCreateBody.parse({ body: ' Internal note ' }).body).toBe(
      'Internal note',
    );
  });
});
