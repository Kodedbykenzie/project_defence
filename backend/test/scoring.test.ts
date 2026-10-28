/**
 * Unit tests for the diagnostic scoring and the recommendation rule
 * (proposal §3.3.1 FR3/FR4 and §3.3.3).
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAnswers, weakDomains, type DiagnosticQuestion, type DomainScoreRow } from '../src/lib/scoring.js';

const question = (id: string, domain_id: string, answer_index: number): DiagnosticQuestion => ({
  id,
  domain_id,
  prompt: `q ${id}`,
  options: ['a', 'b', 'c', 'd'],
  answer_index,
  explanation: null,
});

/** Three items per domain, as the seeded diagnostic has. */
const DIAGNOSTIC: DiagnosticQuestion[] = [
  question('q1', 'budgeting', 0),
  question('q2', 'budgeting', 1),
  question('q3', 'budgeting', 2),
  question('q4', 'saving', 0),
  question('q5', 'saving', 1),
  question('q6', 'saving', 2),
  question('q7', 'debt', 0),
  question('q8', 'debt', 1),
  question('q9', 'debt', 2),
  question('q10', 'digital', 0),
  question('q11', 'digital', 1),
  question('q12', 'digital', 2),
];

const DOMAINS = ['budgeting', 'saving', 'debt', 'digital'];

describe('scoreAnswers', () => {
  test('a perfect run scores 100 overall and 100 per domain', () => {
    const answers = Object.fromEntries(DIAGNOSTIC.map((q) => [q.id, q.answer_index]));
    const { domainScores, total } = scoreAnswers(DIAGNOSTIC, answers, DOMAINS);
    assert.equal(total, 100);
    assert.equal(domainScores.length, 4);
    assert.ok(domainScores.every((d) => d.score === 100 && d.correct === 3 && d.total === 3));
  });

  test('a fully wrong run scores 0 overall', () => {
    const answers = Object.fromEntries(DIAGNOSTIC.map((q) => [q.id, (q.answer_index + 1) % 4]));
    const { total } = scoreAnswers(DIAGNOSTIC, answers, DOMAINS);
    assert.equal(total, 0);
  });

  test('per-domain percentages are rounded, not truncated', () => {
    // 2 of 3 correct = 66.67% → 67
    const answers = { q1: 0, q2: 1, q3: 3, q4: 0, q5: 1, q6: 3, q7: 0, q8: 3, q9: 3, q10: 0, q11: 3, q12: 3 };
    const { domainScores } = scoreAnswers(DIAGNOSTIC, answers, DOMAINS);
    const budgeting = domainScores.find((d) => d.domainId === 'budgeting')!;
    assert.equal(budgeting.score, 67);
    assert.equal(budgeting.correct, 2);
  });

  test('the total is computed from all items, not the mean of domain scores', () => {
    // budgeting 2/3 (67), saving 1/3 (33), debt 3/3 (100), digital 0/3 (0)
    // → 6 of 12 = 50%. The mean of the domain percentages would be 50 too,
    // but 3/3 + 0/3 + 1/3 + 2/3 = 50% is not 4/4*100.
    const answers = { q1: 0, q2: 1, q3: 3, q4: 0, q5: 3, q6: 3, q7: 0, q8: 1, q9: 2, q10: 3, q11: 3, q12: 3 };
    const { domainScores, total } = scoreAnswers(DIAGNOSTIC, answers, DOMAINS);
    assert.equal(total, 50);
    assert.deepEqual(
      domainScores.map((d) => d.score),
      [67, 33, 100, 0],
    );
  });

  test('an unanswered item counts as incorrect within its domain', () => {
    const answers = { q1: 0, q2: 1, q3: 2 }; // only budgeting answered
    const { domainScores, total } = scoreAnswers(DIAGNOSTIC, answers, DOMAINS);
    const budgeting = domainScores.find((d) => d.domainId === 'budgeting')!;
    assert.equal(budgeting.correct, 3);
    assert.equal(budgeting.total, 3);
    // The other domains have no correct answers but still count all 3 items.
    const saving = domainScores.find((d) => d.domainId === 'saving')!;
    assert.equal(saving.score, 0);
    assert.equal(total, 25);
  });

  test('an empty diagnostic scores 0 rather than dividing by zero', () => {
    const { domainScores, total } = scoreAnswers([], {}, DOMAINS);
    assert.equal(total, 0);
    assert.ok(domainScores.every((d) => d.score === 0));
  });

  test('a domain with no items scores 0', () => {
    const { domainScores } = scoreAnswers(DIAGNOSTIC, {}, ['investing']);
    assert.equal(domainScores[0]?.score, 0);
    assert.equal(domainScores[0]?.total, 0);
  });
});

describe('weakDomains — the recommendation rule (proposal §3.3.3)', () => {
  const rows = (...pairs: [string, number][]): DomainScoreRow[] =>
    pairs.map(([domainId, score]) => ({ domainId, correct: 0, total: 3, score }));

  test('a domain at exactly the threshold is NOT weak', () => {
    const weak = weakDomains(rows(['saving', 60]), 60);
    assert.equal(weak.length, 0);
  });

  test('a domain one point below the threshold IS weak', () => {
    const weak = weakDomains(rows(['saving', 59]), 60);
    assert.equal(weak.length, 1);
    assert.equal(weak[0]?.domainId, 'saving');
  });

  test('weak domains are ordered weakest first', () => {
    const weak = weakDomains(rows(['debt', 33], ['budgeting', 0], ['saving', 50]), 60);
    assert.deepEqual(weak.map((d) => d.domainId), ['budgeting', 'debt', 'saving']);
  });

  test('a strong domain is excluded', () => {
    const weak = weakDomains(rows(['digital', 100], ['saving', 33]), 60);
    assert.deepEqual(weak.map((d) => d.domainId), ['saving']);
  });

  test('a higher threshold can only make more domains weak', () => {
    const scores = rows(['digital', 70], ['saving', 45]);
    assert.equal(weakDomains(scores, 60).length, 1);
    assert.equal(weakDomains(scores, 80).length, 2);
  });

  test('no weak domains means no recommendations', () => {
    assert.equal(weakDomains(rows(['digital', 100], ['saving', 90]), 60).length, 0);
  });

  test('the input array is not mutated', () => {
    const scores = rows(['debt', 33], ['saving', 10]);
    const snapshot = scores.map((d) => d.domainId);
    weakDomains(scores, 60);
    assert.deepEqual(scores.map((d) => d.domainId), snapshot);
  });
});
