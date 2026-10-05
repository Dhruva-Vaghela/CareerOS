import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock3, FileText, RefreshCw, Target, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './Alert';
import { Button } from './Button';

interface ChecklistItem { id: string; title: string; description?: string; completed: boolean }
interface RoadmapTopic {
  id: string;
  title: string;
  description?: string;
  subtopics: Array<{ id: string; title: string; checklist: ChecklistItem[] }>;
}
interface RoadmapModule { id: string; title: string; description?: string; topics: RoadmapTopic[] }
interface Roadmap { id: string; version: number; targetRole: string; modules: RoadmapModule[] }
interface QuizQuestion { id: string; question: string; options: string[]; skillName: string; topicName: string }
interface QuizAssessment {
  _id: string;
  title: string;
  type: 'TOPIC_QUIZ' | 'MODULE_ASSESSMENT';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  duration: number;
  totalQuestions: number;
  questions: QuizQuestion[];
}
interface QuizResult {
  score: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredQuestions: number;
  skillPerformance: Array<{ skillName: string; percentage: number }>;
  topicPerformance: Array<{ topicId: string; topicName: string; percentage: number; correctAnswers: number; questionsAttempted: number }>;
  questionReview: Array<{ questionId: string; correctAnswer: string; explanation: string; isCorrect: boolean }>;
}
interface QuizUnit {
  id: string;
  type: 'TOPIC_QUIZ' | 'MODULE_ASSESSMENT';
  module: RoadmapModule;
  topic?: RoadmapTopic;
  title: string;
  description: string;
  context: string;
  skillNames: string[];
  topicContexts: Array<{ id: string; title: string; description: string; skillNames: string[]; skillIds: string[] }>;
  isUnlocked: boolean;
}

function responseData<T>(body: any): T {
  return body.data ?? body;
}

export function RoadmapAssessmentExperience() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [difficulty, setDifficulty] = useState<'MEDIUM' | 'HARD'>('HARD');
  const [assessment, setAssessment] = useState<QuizAssessment | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchRoadmap = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('/api/v1/roadmaps/active', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || 'Unable to load your active roadmap.');
        setRoadmap(responseData<{ roadmap: Roadmap | null }>(body).roadmap ?? null);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) void fetchRoadmap();
    return () => controller.abort();
  }, [accessToken]);

  const quizUnits: QuizUnit[] = (roadmap?.modules ?? []).flatMap((module) => {
    const topicUnits = module.topics.map((topic) => {
      const skills = topic.subtopics.map((subtopic) => subtopic.title);
      const context = [topic.description, ...topic.subtopics.flatMap((subtopic) => [
        subtopic.title,
        ...subtopic.checklist.flatMap((item) => [item.title, item.description]),
      ])].filter(Boolean).join('\n');
      return {
        id: `topic-${topic.id}`,
        type: 'TOPIC_QUIZ' as const,
        module,
        topic,
        title: topic.title,
        description: `Topic quiz · ${module.title}`,
        context,
        skillNames: skills.length ? skills : [topic.title],
        topicContexts: [{
          id: topic.id,
          title: topic.title,
          description: context,
          skillNames: skills.length ? skills : [topic.title],
          skillIds: skills.length ? topic.subtopics.map((subtopic) => subtopic.id) : [topic.id],
        }],
        isUnlocked: true,
      };
    });
    const moduleContext = module.topics.map((topic) => [
      topic.title,
      topic.description,
      ...topic.subtopics.flatMap((subtopic) => [
        subtopic.title,
        ...subtopic.checklist.flatMap((item) => [item.title, item.description]),
      ]),
    ].filter(Boolean).join('\n')).join('\n\n');
    const moduleUnit: QuizUnit = {
      id: `module-${module.id}`,
      type: 'MODULE_ASSESSMENT',
      module,
      title: `${module.title} assessment`,
      description: `${module.topics.length} roadmap topics · module assessment`,
      context: moduleContext,
      skillNames: module.topics.length ? module.topics.map((topic) => topic.title) : [module.title],
      topicContexts: module.topics.map((topic) => {
        const topicSkills = topic.subtopics.map((subtopic) => subtopic.title);
        const description = [topic.description, ...topic.subtopics.flatMap((subtopic) => [
          subtopic.title,
          ...subtopic.checklist.flatMap((item) => [item.title, item.description]),
        ])].filter(Boolean).join('\n');
        return {
          id: topic.id,
          title: topic.title,
          description,
          skillNames: topicSkills.length ? topicSkills : [topic.title],
          skillIds: topicSkills.length ? topic.subtopics.map((subtopic) => subtopic.id) : [topic.id],
        };
      }),
      isUnlocked: module.topics.some((topic) => topic.subtopics.some((subtopic) => subtopic.checklist.length > 0)) &&
        module.topics.flatMap((topic) => topic.subtopics).flatMap((subtopic) => subtopic.checklist).every((item) => item.completed),
    };
    return [...topicUnits, moduleUnit];
  });

  const resetQuiz = () => {
    setAssessment(null);
    setAttemptId('');
    setAnswers({});
    setQuestionIndex(0);
    setResult(null);
  };

  const generateQuiz = async (unit: QuizUnit) => {
    setIsGenerating(true);
    setError('');
    resetQuiz();
    try {
      const response = await fetch('/api/v1/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          targetRole: roadmap?.targetRole || 'Career learner',
          roadmapId: roadmap?.id,
          roadmapVersion: roadmap?.version,
          moduleId: unit.module.id,
          moduleTitle: unit.module.title,
          topicId: unit.topic?.id ?? `module-${unit.module.id}`,
          topicTitle: unit.topic?.title ?? unit.module.title,
          topicDescription: unit.context,
          skillNames: unit.skillNames,
          topicContexts: unit.topicContexts,
          type: unit.type,
          difficulty,
          duration: unit.type === 'MODULE_ASSESSMENT' ? 20 : 12,
          totalQuestions: unit.type === 'MODULE_ASSESSMENT' ? 8 : 5,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Could not generate this quiz.');
      const generated = responseData<{ assessment: QuizAssessment }>(body).assessment;
      const attemptResponse = await fetch(`/api/v1/assessments/${generated._id}/attempts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const attemptBody = await attemptResponse.json();
      if (!attemptResponse.ok) throw new Error(attemptBody.error?.message || 'Could not start this quiz.');
      const attempt = responseData<{ attempt: { _id: string } }>(attemptBody).attempt;
      setAssessment(generated);
      setAttemptId(attempt._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate this quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  const submitQuiz = async () => {
    if (!assessment || !attemptId) return;
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`/api/v1/assessments/${assessment._id}/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Could not submit this quiz.');
      setResult(responseData<{ result: QuizResult }>(body).result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit this quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion = assessment?.questions[questionIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <section className="cockpit-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div className="tech-badge tech-badge-indigo"><BookOpen size={12} /> ROADMAP ASSESSMENTS</div>
            <h2 style={{ margin: '0.6rem 0 0', color: '#0f172a', fontSize: '1.5rem' }}>Quizzes for your learning path</h2>
            <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
              {roadmap ? `${roadmap.targetRole} · Roadmap v${roadmap.version}` : 'Topic quizzes and module assessments generated from your current roadmap.'}
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', color: '#334155', fontSize: '0.9rem' }}>
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as 'MEDIUM' | 'HARD')} style={{ padding: '0.5rem 0.65rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#0f172a' }}>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
        </div>
      </section>
      {error && <Alert type="error" message={error} />}
      {isLoading ? (
        <section className="cockpit-panel" style={{ padding: '1.5rem', color: '#475569' }}>Loading your roadmap assessments...</section>
      ) : !roadmap ? (
        <section className="cockpit-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: '#475569' }}>Generate a roadmap to get quizzes matched to its topics and skills.</p>
          <Button onClick={() => navigate('/dashboard?tab=roadmap')}>Open roadmap</Button>
        </section>
      ) : (
        <section className="cockpit-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#334155' }}>
            <Target size={17} color="#4f46e5" /> {quizUnits.length} assessment units from the active roadmap
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {quizUnits.map((unit) => (
              <article key={unit.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.78rem' }}>
                  {unit.type === 'TOPIC_QUIZ' ? <FileText size={14} /> : <Trophy size={14} />}
                  {unit.type === 'TOPIC_QUIZ' ? 'TOPIC QUIZ' : 'MODULE ASSESSMENT'}
                </div>
                <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{unit.title}</strong>
                <span style={{ color: '#64748b', fontSize: '0.85rem', flex: 1 }}>{unit.description}</span>
                {!unit.isUnlocked && unit.type === 'MODULE_ASSESSMENT' && <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Complete this module's checklist to unlock.</span>}
                <Button onClick={() => void generateQuiz(unit)} disabled={isGenerating || !unit.isUnlocked} variant="secondary" style={{ width: '100%' }}>
                  <RefreshCw size={14} style={{ marginRight: '0.4rem' }} />
                  {isGenerating ? 'Generating fresh set...' : unit.isUnlocked ? 'Generate fresh quiz' : 'Module not complete'}
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
      {assessment && !result && currentQuestion && (
        <section className="cockpit-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span className="tech-badge tech-badge-emerald">{assessment.difficulty} · {assessment.type.replace('_', ' ')}</span>
              <h3 style={{ margin: '0.65rem 0 0', color: '#0f172a', fontSize: '1.25rem' }}>{assessment.title}</h3>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}><Clock3 size={15} /> {assessment.duration} min</span>
          </div>
          <p style={{ margin: '1.3rem 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Question {questionIndex + 1} of {assessment.questions.length} · {currentQuestion.topicName} · {currentQuestion.skillName}</p>
          <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem', lineHeight: 1.5 }}>{currentQuestion.question}</h4>
          <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
            {currentQuestion.options.map((option) => (
              <button key={option} onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }))} style={{ textAlign: 'left', border: answers[currentQuestion.id] === option ? '1px solid #4f46e5' : '1px solid #dbe2ea', borderRadius: '8px', background: answers[currentQuestion.id] === option ? 'rgba(79,70,229,0.06)' : '#fff', color: '#0f172a', padding: '0.8rem 0.95rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                {option}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}>Previous</Button>
            {questionIndex < assessment.questions.length - 1 ? <Button onClick={() => setQuestionIndex((index) => index + 1)}>Next</Button> : <Button isLoading={isSubmitting} onClick={() => void submitQuiz()}>Submit quiz</Button>}
          </div>
        </section>
      )}
      {result && assessment && (
        <section className="cockpit-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div><div className="tech-badge tech-badge-emerald"><CheckCircle2 size={12} /> SCORED</div><h3 style={{ margin: '0.55rem 0 0', color: '#0f172a' }}>{assessment.title}</h3></div>
            <strong style={{ color: '#4f46e5', fontSize: '2rem' }}>{result.score}%</strong>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '1rem 0', color: '#475569' }}>
            <span>Correct: {result.correctAnswers}</span><span>Incorrect: {result.incorrectAnswers}</span><span>Unanswered: {result.unansweredQuestions}</span>
          </div>
          <h4 style={{ color: '#0f172a', marginBottom: '0.5rem' }}>Skill performance</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {result.skillPerformance.map((skill) => <div key={skill.skillName} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', color: '#334155' }}><span>{skill.skillName}</span><strong>{skill.percentage}%</strong></div>)}
          </div>
          <h4 style={{ color: '#0f172a', margin: '1rem 0 0.5rem' }}>Topic performance</h4>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {result.topicPerformance.map((topic) => <div key={topic.topicId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', color: '#334155' }}><span>{topic.topicName} · {topic.correctAnswers}/{topic.questionsAttempted}</span><strong>{topic.percentage}%</strong></div>)}
          </div>
          <h4 style={{ color: '#0f172a', margin: '1rem 0 0.5rem' }}>Question review</h4>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {assessment.questions.map((question) => {
              const review = result.questionReview.find((item) => item.questionId === question.id);
              return (
                <div key={question.id} style={{ padding: '0.85rem', background: '#f8fafc', borderRadius: '6px', color: '#334155' }}>
                  <strong>{question.question}</strong>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.88rem' }}>Correct answer: {review?.correctAnswer}</p>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>{review?.explanation}</p>
                </div>
              );
            })}
          </div>
          <Button onClick={resetQuiz} style={{ marginTop: '1.25rem' }}>Done</Button>
        </section>
      )}
    </div>
  );
}