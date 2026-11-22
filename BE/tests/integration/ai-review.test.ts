// DSE-28/31/32/33: AI review of a submission for the teacher.
import { describe, expect, it, vi } from 'vitest';
import { SubmissionModel } from '../../src/models/submission.model';
import { TestCaseModel } from '../../src/models/testcase.model';
import { api } from '../helpers/api';
import { geminiRecorder } from '../helpers/gemini-recorder';
import { bearerFor, student, teacher } from '../helpers/user-factory';

const setup = async () => {
  const teacherAuth = bearerFor(await teacher());
  const { body: assignment } = await api()
    .post('/api/assignments')
    .set('Authorization', teacherAuth)
    .send({ title: 'Sum two numbers', instructions: 'Read a and b, print a+b', status: 'published', maxScore: 10 });
  const { body: rubric } = await api()
    .post(`/api/rubrics/assignment/${assignment._id}`)
    .set('Authorization', teacherAuth)
    .send({ criteria: [{ name: 'Correctness', weight: 50, maxScore: 10 }, { name: 'Style', weight: 50, maxScore: 10 }] });
  const [visible, hidden] = await TestCaseModel.create([
    { assignmentId: assignment._id, input: '1 2', expectedOutput: '3', isHidden: false, points: 1, order: 0 },
    { assignmentId: assignment._id, input: 'SECRET-INPUT', expectedOutput: 'SECRET-OUT', isHidden: true, points: 1, order: 1 }
  ]);
  const studentAuth = bearerFor(await student());
  const { body: submission } = await api()
    .post('/api/submissions')
    .set('Authorization', studentAuth)
    .send({ assignment: assignment._id, code: 'a, b = input().split()\nprint(a + b)', language: 'python' });
  await SubmissionModel.findByIdAndUpdate(submission._id, {
    runStatus: 'completed',
    testResults: [
      { testCaseId: visible._id, passed: false, stdout: '12\n', stderr: '', exitCode: 0, executionTimeMs: 5, memoryUsedMB: 0, points: 0 },
      { testCaseId: hidden._id, passed: false, stdout: 'x', stderr: '', exitCode: 0, executionTimeMs: 5, memoryUsedMB: 0, points: 0 }
    ]
  });
  const [correctness, style] = rubric.criteria.map((c: { _id: string }) => c._id);
  return { teacherAuth, studentAuth, submissionId: submission._id as string, correctness, style };
};

const review = (auth: string, id: string) => api().post(`/api/submissions/${id}/ai-review`).set('Authorization', auth).send();

const modelAnswer = (correctness: string, style: string) =>
  JSON.stringify({
    summary: 'Inputs are concatenated as strings.',
    issues: [
      {
        title: 'String concatenation instead of addition',
        severity: 'high',
        lineStart: 2,
        snippet: 'print(a + b)',
        cause: 'input().split() returns strings',
        fixSteps: ['Convert a and b with int()'],
        concepts: ['type conversion']
      }
    ],
    criterionSuggestions: [
      { criterionId: correctness, score: 14, reason: 'too high on purpose' },
      { criterionId: style, score: 8, reason: 'readable' },
      { criterionId: 'not-a-criterion', score: 5, reason: 'ignored' }
    ],
    suggestedFeedback: 'Check the type of values returned by input().',
    confidence: 'medium',
    limitations: 'Code was not executed by the AI.'
  });

describe('AI review', () => {
  it('sends the code with line numbers, keeps hidden tests secret, stores a clamped suggestion', async () => {
    const { teacherAuth, submissionId, correctness, style } = await setup();
    geminiRecorder.replyText = modelAnswer(correctness, style);

    const res = await review(teacherAuth, submissionId);
    expect(res.status).toBe(200);

    const request = geminiRecorder.requests[0] as { contents: { parts: { text: string }[] }[]; config: Record<string, unknown> };
    const prompt = request.contents[0].parts[0].text;
    expect(prompt).toContain('   2 | print(a + b)');
    expect(prompt).toContain(`criterionId=${correctness}`);
    expect(prompt).toContain('"12\\n"');
    expect(prompt).toContain('(hidden): FAILED');
    expect(prompt).not.toContain('SECRET');
    expect(request.config.responseMimeType).toBe('application/json');

    expect(res.body.issues[0]).toMatchObject({ lineStart: 2, fixSteps: ['Convert a and b with int()'] });
    expect(res.body.criterionSuggestions).toHaveLength(2);
    expect(res.body.criterionSuggestions[0]).toMatchObject({ name: 'Correctness', score: 10 }); // clamped to max
    expect(res.body.suggestedScore).toBe(9); // (10/10·50 + 8/10·50)/100 · 10
    expect(res.body.generatedAt).toEqual(expect.any(String));

    const stored = await SubmissionModel.findById(submissionId);
    expect(stored!.aiReview).toMatchObject({ suggestedScore: 9 });
    expect(stored!.score).toBeUndefined(); // a suggestion is never the grade
  });

  it('answers 502 for a malformed AI answer and keeps the submission unchanged', async () => {
    const { teacherAuth, submissionId } = await setup();
    geminiRecorder.replyText = '{"summary": 1}';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect((await review(teacherAuth, submissionId)).status).toBe(502);
    expect((await SubmissionModel.findById(submissionId))!.aiReview).toBeUndefined();
  });

  it('is for the assignment teacher only', async () => {
    const { studentAuth, submissionId } = await setup();
    expect((await review(studentAuth, submissionId)).status).toBe(403);
    expect((await review(bearerFor(await teacher()), submissionId)).status).toBe(404);
  });

  it('limits each teacher to 5 reviews per minute', async () => {
    const { teacherAuth, submissionId, correctness, style } = await setup();
    geminiRecorder.replyText = modelAnswer(correctness, style);
    for (let i = 0; i < 5; i += 1) expect((await review(teacherAuth, submissionId)).status).toBe(200);
    const limited = await review(teacherAuth, submissionId);
    expect(limited.status).toBe(429);
    expect(limited.body.message).toBe('Too many AI reviews. Wait a minute and try again.');
  });
});
