/**
 * AI grading assistant (DSE-28/31/32): reviews one submission for the teacher.
 * The result is a suggestion stored in `submission.aiReview`; it never becomes
 * the score by itself — the teacher grades and finalizes (grading.service.ts).
 */
import { z } from 'zod';
import { aiReviewConfig } from '../config/ai-review';
import { RubricModel } from '../models/rubric.model';
import { TestCaseModel } from '../models/testcase.model';
import { generateAiJson } from './ai.service';
import { computeRubricScore, loadForStaff } from './grading.service';
import type { Actor } from './submission.service';

const aiReviewSchema = z.object({
  summary: z.string(),
  issues: z
    .array(
      z.object({
        title: z.string(),
        severity: z.enum(['high', 'medium', 'low']).catch('medium'),
        lineStart: z.number().int().positive().optional().catch(undefined),
        lineEnd: z.number().int().positive().optional().catch(undefined),
        snippet: z.string().optional(),
        cause: z.string(),
        fixSteps: z.array(z.string()).default([]),
        concepts: z.array(z.string()).default([])
      })
    )
    .default([]),
  criterionSuggestions: z
    .array(z.object({ criterionId: z.string(), score: z.number(), reason: z.string().default('') }))
    .default([]),
  suggestedFeedback: z.string().default(''),
  confidence: z.enum(['high', 'medium', 'low']).catch('low'),
  limitations: z.string().default('')
});

export type AiReview = z.infer<typeof aiReviewSchema>;

const numbered = (code: string) =>
  code
    .split('\n')
    .map((line, index) => `${String(index + 1).padStart(4)} | ${line}`)
    .join('\n');

/** Builds the prompt from the assignment, rubric, code and latest test results. */
export const buildReviewPrompt = (parts: {
  title: string;
  description: string;
  instructions: string;
  maxScore: number;
  language: string;
  code: string;
  criteria: { id: string; name: string; description: string; weight: number; maxScore: number }[];
  tests: { input?: string; expectedOutput?: string; hidden: boolean; passed?: boolean; stdout?: string; stderr?: string }[];
  runStatus?: string;
}) => {
  const code = parts.code.length > aiReviewConfig.maxCodeChars ? parts.code.slice(0, aiReviewConfig.maxCodeChars) : parts.code;
  const truncated = code.length < parts.code.length;
  const tests = parts.tests.length
    ? parts.tests
        .map((t, i) => {
          const result = t.passed === undefined ? 'not run' : t.passed ? 'PASSED' : 'FAILED';
          if (t.hidden) return `#${i + 1} (hidden): ${result}`;
          return [`#${i + 1}: ${result}`, `  input: ${JSON.stringify(t.input)}`, `  expected: ${JSON.stringify(t.expectedOutput)}`,
            t.stdout !== undefined ? `  actual stdout: ${JSON.stringify(t.stdout.slice(0, 500))}` : '',
            t.stderr ? `  stderr: ${JSON.stringify(t.stderr.slice(0, 500))}` : ''].filter(Boolean).join('\n');
        })
        .join('\n')
    : 'No test cases.';
  const rubric = parts.criteria.length
    ? parts.criteria.map((c) => `- criterionId=${c.id} | ${c.name} (max ${c.maxScore}, weight ${c.weight}%): ${c.description}`).join('\n')
    : 'No rubric.';

  return [
    `# Assignment: ${parts.title} (max score ${parts.maxScore})`,
    parts.description,
    `## Instructions\n${parts.instructions || '(none)'}`,
    `## Rubric\n${rubric}`,
    `## Test results (latest run: ${parts.runStatus ?? 'not run yet'})\n${tests}`,
    `## Student code (${parts.language})${truncated ? ` — truncated to the first ${aiReviewConfig.maxCodeChars} characters` : ''}`,
    numbered(code)
  ].join('\n\n');
};

/**
 * DSE-32: ask the AI for issues, per-criterion score suggestions and draft feedback.
 * Unknown criteria are dropped and scores clamped to each criterion's range,
 * so a sloppy model answer can never produce an impossible suggestion.
 */
export const reviewSubmission = async (actor: Actor, id: string) => {
  const { submission, assignment } = await loadForStaff(actor, id);
  const [rubric, testCases] = await Promise.all([
    RubricModel.findOne({ assignmentId: assignment._id }),
    TestCaseModel.find({ assignmentId: assignment._id }).sort({ order: 1 })
  ]);
  const criteria = (rubric?.criteria ?? []).map((c) => ({
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    weight: c.weight,
    maxScore: c.maxScore
  }));
  const results = new Map(submission.testResults.map((r) => [r.testCaseId.toString(), r]));

  const prompt = buildReviewPrompt({
    title: assignment.title,
    description: assignment.description ?? '',
    instructions: assignment.instructions ?? '',
    maxScore: assignment.maxScore,
    language: submission.language,
    code: submission.code,
    criteria,
    runStatus: submission.runStatus,
    tests: testCases.map((t) => {
      const r = results.get(t._id.toString());
      return t.isHidden
        ? { hidden: true, passed: r?.passed }
        : { hidden: false, input: t.input, expectedOutput: t.expectedOutput, passed: r?.passed, stdout: r?.stdout, stderr: r?.stderr };
    })
  });

  const review = await generateAiJson(
    { systemPrompt: aiReviewConfig.systemPrompt, thinkingLevel: aiReviewConfig.thinkingLevel, messages: [{ role: 'user', text: prompt }] },
    aiReviewSchema
  );

  const byId = new Map(criteria.map((c) => [c.id, c]));
  const suggestions = review.criterionSuggestions
    .filter((s) => byId.has(s.criterionId))
    .map((s) => {
      const c = byId.get(s.criterionId)!;
      return { ...s, name: c.name, maxScore: c.maxScore, weight: c.weight, score: Math.min(Math.max(Math.round(s.score), 0), c.maxScore) };
    });
  const complete = criteria.length > 0 && suggestions.length === criteria.length;

  const aiReview = {
    ...review,
    criterionSuggestions: suggestions,
    suggestedScore: complete ? computeRubricScore(suggestions, assignment.maxScore) : null,
    generatedAt: new Date().toISOString()
  };
  submission.set({ aiReview });
  await submission.save();
  return aiReview;
};
