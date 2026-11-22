#!/usr/bin/env node
// DSE-44: end-to-end check of the grading flow against a running stack, and demo data for presentations.
// Needs: docker compose up -d, npm run seed, npm run sandbox, BE with SANDBOX_API_URL set. GEMINI_API_KEY optional.
// Usage: npm run e2e   (E2E_API_URL overrides http://localhost:5003/api)
const base = process.env.E2E_API_URL ?? 'http://localhost:5003/api';
const call = async (method, path, token, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  return json;
};
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).token;
const step = (label, value) => console.log(`✔ ${label}${value !== undefined ? ': ' + value : ''}`);

const teacher = await login('teacher@example.com', 'teacher1234');
const student = await login('student01@example.com', 'student1234');

const assignment = await call('POST', '/assignments', teacher, {
  title: `Tổng hai số (E2E ${new Date().toISOString().slice(11, 19)})`,
  description: 'Đọc hai số nguyên a, b và in ra a + b.',
  instructions: 'Đầu vào: một dòng gồm hai số nguyên a b cách nhau bởi dấu cách.\nĐầu ra: một số nguyên là tổng a + b.',
  status: 'published',
  maxScore: 10
});
const aid = assignment._id;
step('assignment', aid);
const rubric = await call('POST', `/rubrics/assignment/${aid}`, teacher, {
  criteria: [
    { name: 'Correctness', description: 'Passes the test cases', weight: 70, maxScore: 10 },
    { name: 'Code style', description: 'Readable names, no dead code', weight: 30, maxScore: 5 }
  ]
});
step('rubric criteria', rubric.criteria.length);
await call('POST', `/test-cases/assignment/${aid}/bulk`, teacher, [
  { input: '1 2', expectedOutput: '3', points: 5 },
  { input: '10 20', expectedOutput: '30', points: 5, isHidden: true }
]);
step('test cases', 2);

// Student: buggy solution (string concatenation)
const sub = await call('POST', '/submissions', student, { assignment: aid, language: 'python', code: 'a, b = input().split()\nprint(a + b)' });
const { jobId } = await call('POST', `/submissions/${sub._id}/run`, student, {});
let run;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 500));
  run = await call('GET', `/submissions/${sub._id}/run-result?jobId=${jobId}`, student);
  if (['completed', 'failed'].includes(run.status)) break;
}
step('run', `${run.status} ${run.result?.summary?.passed}/${run.result?.summary?.total}, runStatus=${run.submission.runStatus}`);
const hiddenRow = run.submission.testResults.find((r) => r.hidden);
step('student run-result hides hidden stdout', JSON.stringify(hiddenRow?.stdout) + ' hidden=' + hiddenRow?.hidden);
if (run.result?.sandboxResponse) throw new Error('raw sandbox response leaked to student');

// Teacher
const queue = await call('GET', `/submissions/review?assignment=${aid}&status=submitted`, teacher);
step('teacher queue', queue.total);
const detail = await call('GET', `/submissions/${sub._id}`, teacher);
step('teacher detail testResults', detail.submission.testResults.map((r) => `${r.passed ? 'P' : 'F'}:${JSON.stringify(r.stdout)}`).join(' '));

let ai;
try {
  ai = await call('POST', `/submissions/${sub._id}/ai-review`, teacher);
  step('AI review', `confidence=${ai.confidence} suggestedScore=${ai.suggestedScore} issues=${ai.issues.length}`);
  console.log('   summary:', ai.summary);
  for (const issue of ai.issues) console.log(`   - [${issue.severity}] L${issue.lineStart ?? '?'} ${issue.title}: ${issue.cause}`);
  for (const s of ai.criterionSuggestions) console.log(`   - ${s.name}: ${s.score}/${s.maxScore} (${s.reason})`);
} catch (error) {
  console.log('✖ AI review failed:', error.message);
}

const [c1, c2] = rubric.criteria.map((c) => c._id);
const graded = await call('POST', `/submissions/${sub._id}/grade`, teacher, { criterionScores: { [c1]: 3, [c2]: 4 }, feedback: 'Chuyển đầu vào sang số nguyên bằng int() trước khi cộng.' });
step('draft grade', graded.score);
const studentDraft = await call('GET', `/submissions/${sub._id}`, student);
step('student sees no draft score', String(studentDraft.submission.score) + ' aiReview=' + String(studentDraft.submission.aiReview));
const final = await call('POST', `/submissions/${sub._id}/finalize`, teacher);
step('finalized', `${final.status} ${final.score}`);
const studentFinal = await call('GET', `/submissions/${sub._id}`, student);
step('student sees final', `${studentFinal.submission.score} "${studentFinal.submission.feedback}" criteria=${studentFinal.submission.criterionScores.length}`);

// Student fixes the code: new attempt passes everything
const fixed = await call('POST', '/submissions', student, { assignment: aid, language: 'python', code: 'a, b = map(int, input().split())\nprint(a + b)' });
const job2 = (await call('POST', `/submissions/${fixed._id}/run`, student, {})).jobId;
let run2;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 500));
  run2 = await call('GET', `/submissions/${fixed._id}/run-result?jobId=${job2}`, student);
  if (['completed', 'failed'].includes(run2.status)) break;
}
step('second attempt', `${run2.result?.summary?.passed}/${run2.result?.summary?.total} totalScore=${run2.submission.totalScore}/${run2.submission.maxScore}`);
console.log(`\nIDs: assignment=${aid} graded=${sub._id} fixed=${fixed._id}`);
