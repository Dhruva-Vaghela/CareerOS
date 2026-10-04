import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { Button } from './Button';
import { Alert } from './Alert';
import {
  Building2,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Mic,
  MicOff,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  BrainCircuit,
  History,
  ShieldCheck,
  Check,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { InterviewRoundType } from '@careeros/shared-types';

interface Question {
  _id: string;
  sessionId: string;
  order: number;
  questionText: string;
  category?: string;
  difficulty: string;
  rubricCriteria?: string[];
}

interface QuestionFeedbackItem {
  questionId?: string;
  order: number;
  questionText: string;
  category?: string;
  difficulty?: string;
  userResponse: string;
  score: number;
  feedback: string;
  expectedCriteria: string[];
  missedCriteria: string[];
  strengths: string[];
  technicalAccuracy?: number;
  communicationClarity?: number;
}

interface FinalFeedback {
  sessionId: string;
  summary: string;
  overallScore: number;
  hiringDecision: string;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
  categoryBreakdown?: Record<string, number>;
  questionsFeedback?: QuestionFeedbackItem[];
}

interface HistoryItem {
  session: {
    _id: string;
    companyName: string;
    jobRole: string;
    experienceLevel: string;
    roundType: string;
    status: string;
    overallScore?: number;
    totalQuestions: number;
    startedAt: string;
    endedAt?: string;
  };
  feedback: FinalFeedback | null;
}

export const CompanyInterviewView: React.FC = () => {
  const { accessToken } = useAuth();
  const { profile } = useProfile();

  // View mode: 'setup' | 'interview' | 'report' | 'history'
  const [viewState, setViewState] = useState<'setup' | 'interview' | 'report' | 'history'>('setup');

  // Setup form states
  const [selectedCompany, setSelectedCompany] = useState<string>('Google');
  const [selectedRole, setSelectedRole] = useState<string>(profile?.targetRole || 'Software Engineer');
  const [selectedLevel, setSelectedLevel] = useState<string>(profile?.experienceLevel || 'INTERMEDIATE');
  const [selectedRound, setSelectedRound] = useState<string>(InterviewRoundType.CODING_ALGORITHMS);
  const questionsCount = 4;
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Active interview states
  const [sessionId, setSessionId] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(4);
  const [candidateResponse, setCandidateResponse] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [finalReport, setFinalReport] = useState<FinalFeedback | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [activeTabSub, setActiveTabSub] = useState<'text' | 'voice'>('voice');

  // History states
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Voice recording & TTS states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const SESSION_STORAGE_KEY = 'careeros_active_company_interview';

  // Restore active interview session if page reloaded or re-mounted
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionId && parsed.currentQuestion) {
          setSessionId(parsed.sessionId);
          setCurrentQuestion(parsed.currentQuestion);
          setQuestionIndex(parsed.questionIndex || 0);
          setTotalQuestions(parsed.totalQuestions || 4);
          setSelectedCompany(parsed.selectedCompany || 'Google');
          setSelectedRole(parsed.selectedRole || 'Software Engineer');
          setSelectedLevel(parsed.selectedLevel || 'INTERMEDIATE');
          setSelectedRound(parsed.selectedRound || InterviewRoundType.CODING_ALGORITHMS);
          if (parsed.audioBase64) setAudioBase64(parsed.audioBase64);
          if (parsed.elapsedSeconds) setElapsedSeconds(parsed.elapsedSeconds);
          setViewState('interview');
        }
      }
    } catch (e) {
      console.warn('Failed to restore active interview session', e);
    }
  }, []);

  // Timer effect during active interview
  useEffect(() => {
    let timer: any = null;
    if (viewState === 'interview') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          try {
            const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              parsed.elapsedSeconds = next;
              sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
            }
          } catch {}
          return next;
        });
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [viewState]);



  const fetchHistory = async () => {
    if (!accessToken) return;
    try {
      setIsLoadingHistory(true);
      const res = await fetch('/api/v1/interviews/history', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Play TTS voice audio for question
  const playQuestionAudio = async (textToPlay: string, base64Audio?: string) => {
    try {
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audioPlayerRef.current = audio;
        setIsPlayingAudio(true);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
        return;
      }

      // Try server synthesis endpoint
      const res = await fetch('/api/v1/interviews/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: textToPlay }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audioPlayerRef.current = audio;
          setIsPlayingAudio(true);
          audio.onended = () => setIsPlayingAudio(false);
          audio.onerror = () => setIsPlayingAudio(false);
          await audio.play();
          return;
        }
      }

      // Fallback to browser SpeechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToPlay);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Audio playback error', err);
      setIsPlayingAudio(false);
    }
  };

  // Start realistic interview simulation
  const handleStartInterview = async () => {
    setError('');
    setIsStarting(true);
    try {
      const res = await fetch('/api/v1/interviews/company/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          companyName: selectedCompany,
          jobRole: selectedRole,
          experienceLevel: selectedLevel,
          roundType: selectedRound,
          questionsCount,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to start company interview');
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setCurrentQuestion(data.firstQuestion);
      setQuestionIndex(0);
      setTotalQuestions(data.totalQuestions || questionsCount);
      setCandidateResponse('');
      setFinalReport(null);
      setViewState('interview');

      // Persist active interview state to prevent accidental loss
      try {
        const sessionData = {
          sessionId: data.sessionId,
          currentQuestion: data.firstQuestion,
          questionIndex: 0,
          totalQuestions: data.totalQuestions || questionsCount,
          selectedCompany,
          selectedRole,
          selectedLevel,
          selectedRound,
          audioBase64: data.audioBase64 || null,
          elapsedSeconds: 0,
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (e) {
        console.warn('Could not save interview session state', e);
      }

      // Auto play interviewer audio if received
      if (data.audioBase64) {
        setAudioBase64(data.audioBase64);
        playQuestionAudio(data.firstQuestion.questionText, data.audioBase64);
      } else {
        playQuestionAudio(data.firstQuestion.questionText);
      }
    } catch (err: any) {
      setError(err.message || 'Could not start interview. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // Voice recording handlers using browser MediaRecorder and Sarvam STT
  const startVoiceRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Send audio to Sarvam AI STT
        await transcribeVoiceBlob(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError('Microphone access denied or unavailable: ' + err.message);
      setIsRecording(false);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const transcribeVoiceBlob = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      const formData = new FormData();
      formData.append('audio', blob, 'response.webm');
      formData.append('languageCode', 'en-IN');

      const res = await fetch('/api/v1/interviews/voice/transcribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcript) {
          setCandidateResponse((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
        }
      }
    } catch (err) {
      console.error('Transcription error', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Submit response turn
  const handleSubmitResponse = async () => {
    if (!candidateResponse.trim()) {
      setError('Please provide your answer by voice recording or typing before submitting.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/interviews/company/${sessionId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionId: currentQuestion?._id,
          responseText: candidateResponse,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit response');
      }

      const data = await res.json();

      if (data.isFinished) {
        try {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {}
        setFinalReport(data.feedback);
        setViewState('report');
      } else {
        const nextIdx = questionIndex + 1;
        setQuestionIndex(nextIdx);
        setCurrentQuestion(data.nextQuestion);
        setCandidateResponse('');

        try {
          const updatedSession = {
            sessionId,
            currentQuestion: data.nextQuestion,
            questionIndex: nextIdx,
            totalQuestions,
            selectedCompany,
            selectedRole,
            selectedLevel,
            selectedRound,
            audioBase64: data.nextAudioBase64 || null,
            elapsedSeconds,
          };
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSession));
        } catch (e) {
          console.warn('Could not update interview session state', e);
        }

        if (data.nextAudioBase64) {
          setAudioBase64(data.nextAudioBase64);
          playQuestionAudio(data.nextQuestion.questionText, data.nextAudioBase64);
        } else if (data.nextQuestion) {
          playQuestionAudio(data.nextQuestion.questionText);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="interview-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Header Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem 2rem',
          borderRadius: 'var(--border-radius-lg)',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid var(--color-surface-border)',
          background: 'var(--gradient-glass)',
          boxShadow: 'var(--shadow-light-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Company Mock Interview
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#4f46e5',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  letterSpacing: '0.05em',
                }}
              >
                Realistic Simulation
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Simulates authentic hiring bars (Google, Amazon, Meta, Startups) with voice & text AI evaluation.
            </p>
          </div>
        </div>

        {/* View Switcher buttons */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => setViewState('setup')}
            className={`btn-ghost-tab ${viewState === 'setup' || viewState === 'interview' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: viewState === 'setup' || viewState === 'interview' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              background: viewState === 'setup' || viewState === 'interview' ? 'rgba(79, 70, 229, 0.08)' : '#fff',
              color: viewState === 'setup' || viewState === 'interview' ? '#4f46e5' : '#64748b',
            }}
          >
            <Sparkles size={15} style={{ display: 'inline', marginRight: '0.4rem' }} />
            Simulation Chamber
          </button>
          <button
            onClick={() => {
              setViewState('history');
              fetchHistory();
            }}
            className={`btn-ghost-tab ${viewState === 'history' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: viewState === 'history' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
              background: viewState === 'history' ? 'rgba(79, 70, 229, 0.08)' : '#fff',
              color: viewState === 'history' ? '#4f46e5' : '#64748b',
            }}
          >
            <History size={15} style={{ display: 'inline', marginRight: '0.4rem' }} />
            Past Reports
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type="error" message={error} />
        </div>
      )}

      {/* VIEW 1: SETUP & CONFIGURATION */}
      {viewState === 'setup' && (
        <div className="animate-reveal" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '2rem' }}>
          {/* Left: Preset Selector & Config */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid var(--color-surface-border)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-light-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>
              Select Target Company & Round
            </h3>

            {/* Top Company Selection Badges */}
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Target Company
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {['Google', 'Amazon', 'Meta', 'Microsoft', 'Netflix', 'High-Growth Startup'].map((comp) => {
                const isSelected = selectedCompany === comp;
                return (
                  <div
                    key={comp}
                    onClick={() => setSelectedCompany(comp)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSelected ? 'rgba(79, 70, 229, 0.05)' : '#f8fafc',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: isSelected ? '#4f46e5' : '#0f172a' }}>
                        {comp}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Top Tier Bar</span>
                    </div>
                    {isSelected && <CheckCircle2 size={18} color="#4f46e5" />}
                  </div>
                );
              })}
            </div>

            {/* Target Role & Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  Target Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  <option value="Software Engineer">Software Engineer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Full Stack Developer">Full Stack Developer</option>
                  <option value="AI Engineer">AI Engineer</option>
                  <option value="Cloud Engineer">Cloud Engineer</option>
                  <option value="Data Scientist">Data Scientist</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.4rem' }}>
                  Experience Level
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  <option value="BEGINNER">Entry Level / L3</option>
                  <option value="INTERMEDIATE">Intermediate / L4 (Mid-Level)</option>
                  <option value="ADVANCED">Senior / L5 (Lead)</option>
                  <option value="PROFESSIONAL">Staff / Principal / L6+</option>
                </select>
              </div>
            </div>

            {/* Round Type Selector */}
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.5rem' }}>
              Interview Round Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
              {[
                {
                  id: InterviewRoundType.CODING_ALGORITHMS,
                  name: 'Coding & Algorithms',
                  desc: 'Data structures, algorithm complexity & optimal edge cases',
                },
                {
                  id: InterviewRoundType.SYSTEM_DESIGN,
                  name: 'System Design & Arch',
                  desc: 'Scalability, microservices, fault tolerance & latency trade-offs',
                },
                {
                  id: InterviewRoundType.BEHAVIORAL_LEADERSHIP,
                  name: 'Behavioral & Leadership',
                  desc: 'STAR method, leadership principles & conflict resolution',
                },
                {
                  id: InterviewRoundType.TECHNICAL_SCREEN,
                  name: 'Technical Screen',
                  desc: 'Core CS fundamentals, API design & runtime concepts',
                },
                {
                  id: InterviewRoundType.DOMAIN_DEEP_DIVE,
                  name: 'Domain Deep Dive',
                  desc: 'Framework mastery, web performance & production security',
                },
              ].map((round) => {
                const isSelected = selectedRound === round.id;
                return (
                  <div
                    key={round.id}
                    onClick={() => setSelectedRound(round.id)}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #0891b2' : '1px solid #e2e8f0',
                      background: isSelected ? 'rgba(8, 145, 178, 0.06)' : '#f8fafc',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: isSelected ? '#0891b2' : '#0f172a' }}>{round.name}</strong>
                      {isSelected && <Check size={16} color="#0891b2" />}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{round.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Start Button CTA */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="#10b981" />
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Strict No-Twin Isolation (Zero Coaching Bias)
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handleStartInterview}
                isLoading={isStarting}
                style={{
                  padding: '0.85rem 1.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  boxShadow: '0 4px 18px rgba(79, 70, 229, 0.35)',
                }}
              >
                <Play size={16} style={{ marginRight: '0.5rem' }} />
                Enter Simulation Chamber
              </Button>
            </div>
          </div>

          {/* Right: Simulation Info & Voice Capabilities */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid #e2e8f0',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={18} color="#4f46e5" />
                How Company Simulation Works
              </h4>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>
                  <strong>Realism Over Coaching:</strong> Unlike Practice Mode, Company Mode does not read your Digital Twin mid-session to ensure 100% authentic interview difficulty.
                </li>
                <li>
                  <strong>Sarvam AI Voice Integration:</strong> Spoken interviewer audio and real-time speech-to-text transcription.
                </li>
                <li>
                  <strong>Calibrated Hiring Bar:</strong> Scores responses across Technical Accuracy, Communication Clarity, and Role Alignment.
                </li>
                <li>
                  <strong>Post-Interview Writeback:</strong> Only upon completion does the evaluation update your Digital Twin and Readiness Score.
                </li>
              </ul>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--border-radius-lg)',
                border: '1px solid rgba(8, 145, 178, 0.2)',
                background: 'rgba(8, 145, 178, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Volume2 size={18} color="#0891b2" />
                <strong style={{ fontSize: '0.85rem', color: '#0e7490' }}>Voice & Spoken Audio Active</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>
                You can answer verbally using your microphone. Sarvam AI speech models transcribe your voice automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ACTIVE INTERVIEW CHAMBER */}
      {viewState === 'interview' && currentQuestion && (
        <div className="animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chamber HUD Bar */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              background: '#0f172a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>{selectedCompany}</strong>
              </div>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{selectedRole}</span>
              <span style={{ color: '#475569' }}>|</span>
              <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>{selectedRound.replace(/_/g, ' ')}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                <Clock size={16} color="#38bdf8" />
                <span>Elapsed: <strong>{formatTimer(elapsedSeconds)}</strong></span>
              </div>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                }}
              >
                Question {questionIndex + 1} of {totalQuestions}
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to exit the interview simulation? Your current progress will end.')) {
                    try {
                      sessionStorage.removeItem(SESSION_STORAGE_KEY);
                    } catch {}
                    setViewState('setup');
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Exit Simulation
              </button>
            </div>
          </div>

          {/* Interviewer Question Card */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: 'var(--shadow-light-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    background: 'rgba(79, 70, 229, 0.1)',
                    color: '#4f46e5',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}
                >
                  {currentQuestion.category || 'Core Problem'}
                </span>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#b45309',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}
                >
                  Difficulty: {currentQuestion.difficulty}
                </span>
              </div>

              {/* TTS Listen Button */}
              <button
                onClick={() => playQuestionAudio(currentQuestion.questionText, audioBase64 || undefined)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: isPlayingAudio ? 'rgba(79, 70, 229, 0.15)' : '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#4f46e5',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Volume2 size={16} className={isPlayingAudio ? 'animate-pulse' : ''} />
                {isPlayingAudio ? 'Speaking...' : 'Listen Question (Sarvam AI)'}
              </button>
            </div>

            {/* Question Text */}
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: '1.6',
                marginBottom: '1.25rem',
              }}
            >
              {currentQuestion.questionText}
            </h3>

            {/* Rubric criteria hints */}
            {currentQuestion.rubricCriteria && currentQuestion.rubricCriteria.length > 0 && (
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <strong style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                  Interviewer Expectations
                </strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {currentQuestion.rubricCriteria.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.75rem',
                        color: '#475569',
                        background: '#fff',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      • {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Candidate Response Workspace */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--border-radius-lg)',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setActiveTabSub('voice')}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: activeTabSub === 'voice' ? '1px solid #4f46e5' : '1px solid transparent',
                    background: activeTabSub === 'voice' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                    color: activeTabSub === 'voice' ? '#4f46e5' : '#64748b',
                  }}
                >
                  <Mic size={15} style={{ display: 'inline', marginRight: '0.4rem' }} />
                  Voice Response (Sarvam AI)
                </button>
                <button
                  onClick={() => setActiveTabSub('text')}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: activeTabSub === 'text' ? '1px solid #4f46e5' : '1px solid transparent',
                    background: activeTabSub === 'text' ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                    color: activeTabSub === 'text' ? '#4f46e5' : '#64748b',
                  }}
                >
                  Text Editor
                </button>
              </div>

              {/* Word Count */}
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Word count: {candidateResponse.trim() ? candidateResponse.trim().split(/\s+/).length : 0}
              </span>
            </div>

            {/* Voice Recording Control Bar */}
            {activeTabSub === 'voice' && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: isRecording ? 'rgba(239, 68, 68, 0.06)' : isTranscribing ? 'rgba(79, 70, 229, 0.06)' : '#f8fafc',
                  border: isRecording ? '1px solid rgba(239, 68, 68, 0.3)' : isTranscribing ? '1px solid rgba(79, 70, 229, 0.3)' : '1px solid #e2e8f0',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button
                    disabled={isTranscribing}
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: isRecording ? '#ef4444' : isTranscribing ? '#6366f1' : '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isTranscribing ? 'not-allowed' : 'pointer',
                      boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.4)' : '0 4px 12px rgba(79, 70, 229, 0.3)',
                    }}
                  >
                    {isRecording ? <MicOff size={20} /> : isTranscribing ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
                  </button>

                  <div>
                    <strong style={{ fontSize: '0.9rem', color: isRecording ? '#ef4444' : isTranscribing ? '#4f46e5' : '#0f172a', display: 'block' }}>
                      {isRecording ? 'Listening (Recording Speech)...' : isTranscribing ? 'Transcribing via Sarvam AI (saarika:v2.5)...' : 'Click to Speak Your Response'}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {isRecording
                        ? `Recording: ${formatTimer(recordingDuration)} — Speak freely, click 'Finish Speaking' when done.`
                        : isTranscribing
                          ? 'Transcribing audio seamlessly with multi-chunk processing...'
                          : 'Supports English & Hindi. Speak as long as you need — transcribed automatically.'}
                    </span>
                  </div>
                </div>

                {isRecording && (
                  <Button variant="secondary" onClick={stopVoiceRecording} style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                    Finish Speaking
                  </Button>
                )}
              </div>
            )}

            {/* Answer Textarea (shows real-time transcript from voice or typed code/text) */}
            <textarea
              rows={8}
              value={candidateResponse}
              onChange={(e) => setCandidateResponse(e.target.value)}
              placeholder="State your answer clearly. Include approach, complexity analysis, trade-offs, and edge case assumptions..."
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                color: '#0f172a',
                background: '#fff',
                marginBottom: '1.25rem',
                resize: 'vertical',
              }}
            />

            {/* Turn Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {questionIndex + 1 === totalQuestions ? 'Final Question in this round' : 'Next question will load immediately'}
              </span>

              <Button
                variant="primary"
                onClick={handleSubmitResponse}
                isLoading={isSubmitting}
                style={{
                  padding: '0.8rem 1.8rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                }}
              >
                <Send size={16} style={{ marginRight: '0.5rem' }} />
                {questionIndex + 1 === totalQuestions ? 'Submit Final Answer & Generate Report' : 'Submit & Next Question'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: FINAL PERFORMANCE EVALUATION REPORT */}
      {viewState === 'report' && finalReport && (
        <div className="animate-reveal" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Executive Header Card */}
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem',
              borderRadius: 'var(--border-radius-lg)',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              boxShadow: 'var(--shadow-light-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Official Hiring Committee Packet
                </span>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                  {selectedCompany} — {selectedRole} Evaluation
                </h2>
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Round: <strong>{selectedRound.replace(/_/g, ' ')}</strong> | Level: {selectedLevel}
                </span>
              </div>

              {/* Hiring Bar Calibrated Verdict Pill */}
              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.6rem 1.5rem',
                    borderRadius: '999px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background:
                      finalReport.hiringDecision === 'STRONG_HIRE' || finalReport.hiringDecision === 'HIRE'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : finalReport.hiringDecision === 'LEAN_HIRE'
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'rgba(239, 68, 68, 0.12)',
                    color:
                      finalReport.hiringDecision === 'STRONG_HIRE' || finalReport.hiringDecision === 'HIRE'
                        ? '#059669'
                        : finalReport.hiringDecision === 'LEAN_HIRE'
                          ? '#d97706'
                          : '#dc2626',
                    border: '1px solid currentColor',
                  }}
                >
                  Decision: {finalReport.hiringDecision.replace(/_/g, ' ')}
                </span>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.4rem' }}>
                  Overall Score: <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{finalReport.overallScore}/100</strong>
                </div>
              </div>
            </div>

            {/* Summary Text */}
            <p style={{ fontSize: '1rem', color: '#334155', lineHeight: '1.7', background: '#f8fafc', padding: '1.25rem', borderRadius: '10px' }}>
              {finalReport.summary}
            </p>

            {/* Score Breakdown Radar/Progress Bars */}
            {finalReport.categoryBreakdown && Object.keys(finalReport.categoryBreakdown).length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
                  Competency Score Breakdown
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {Object.entries(finalReport.categoryBreakdown).map(([cat, val]) => (
                    <div key={cat} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{cat}</span>
                        <strong style={{ fontSize: '0.85rem', color: '#4f46e5' }}>{val}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${val}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Strengths */}
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                borderRadius: 'var(--border-radius-lg)',
                background: '#ffffff',
                border: '1px solid rgba(16, 185, 129, 0.25)',
              }}
            >
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={20} />
                Demonstrated Strengths
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {finalReport.strengths.map((str, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weak Areas & Gaps */}
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                borderRadius: 'var(--border-radius-lg)',
                background: '#ffffff',
                border: '1px solid rgba(239, 68, 68, 0.25)',
              }}
            >
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <AlertTriangle size={20} />
                Critical Gaps & Refinements
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {finalReport.weakAreas.map((weak, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>!</span>
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Turn-by-Turn Question Breakdown & Score Justification */}
          {finalReport.questionsFeedback && finalReport.questionsFeedback.length > 0 && (
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                borderRadius: 'var(--border-radius-lg)',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: 'var(--shadow-light-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={22} color="#4f46e5" />
                    Turn-by-Turn Question Breakdown & Score Justification
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                    Transparent analysis of what the interviewer expected vs. what was covered or missed in each answer.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {finalReport.questionsFeedback.map((qf, idx) => {
                  const isHigh = qf.score >= 75;
                  const isMid = qf.score >= 50 && qf.score < 75;
                  const scoreBg = isHigh ? 'rgba(16, 185, 129, 0.1)' : isMid ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                  const scoreColor = isHigh ? '#059669' : isMid ? '#d97706' : '#dc2626';

                  return (
                    <div
                      key={qf.questionId || idx}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                      }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span
                            style={{
                              background: '#4f46e5',
                              color: '#fff',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                            }}
                          >
                            Q{qf.order || idx + 1}
                          </span>
                          {qf.category && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                              {qf.category}
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '999px',
                            background: scoreBg,
                            color: scoreColor,
                            border: `1px solid ${scoreColor}33`,
                          }}
                        >
                          Score: {qf.score}/100
                        </span>
                      </div>

                      {/* Question Asked */}
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.2rem' }}>
                          Question Asked
                        </strong>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                          {qf.questionText}
                        </p>
                      </div>

                      {/* Candidate's Submitted Response */}
                      <div style={{ marginBottom: '1.25rem', background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.35rem' }}>
                          Candidate's Submitted Answer
                        </strong>
                        <p style={{ fontSize: '0.88rem', color: '#334155', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                          "{qf.userResponse || 'No response provided'}"
                        </p>
                      </div>

                      {/* Evaluation Breakdown Grid: Needed vs Missed vs Covered */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                        {/* 1. What was needed */}
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#0e7490', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            🎯 What Was Needed
                          </strong>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {qf.expectedCriteria && qf.expectedCriteria.length > 0 ? (
                              qf.expectedCriteria.map((exp, i) => (
                                <li key={i} style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '0.4rem' }}>
                                  <span style={{ color: '#0891b2' }}>•</span>
                                  <span>{exp}</span>
                                </li>
                              ))
                            ) : (
                              <li style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Core domain accuracy & structure</li>
                            )}
                          </ul>
                        </div>

                        {/* 2. What was missed / score justification */}
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            ❌ What Was Missed / Gaps
                          </strong>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {qf.missedCriteria && qf.missedCriteria.length > 0 ? (
                              qf.missedCriteria.map((miss, i) => (
                                <li key={i} style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '0.4rem' }}>
                                  <span style={{ color: '#ef4444' }}>✕</span>
                                  <span>{miss}</span>
                                </li>
                              ))
                            ) : (
                              <li style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No major critical omissions</li>
                            )}
                          </ul>
                        </div>

                        {/* 3. What was covered well */}
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <strong style={{ fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            ✅ What Was Covered
                          </strong>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {qf.strengths && qf.strengths.length > 0 ? (
                              qf.strengths.map((str, i) => (
                                <li key={i} style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '0.4rem' }}>
                                  <span style={{ color: '#10b981' }}>✓</span>
                                  <span>{str}</span>
                                </li>
                              ))
                            ) : (
                              <li style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Basic prompt response attempted</li>
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Score Justification Note */}
                      <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.04)', border: '1px solid rgba(79, 70, 229, 0.15)' }}>
                        <strong style={{ fontSize: '0.75rem', color: '#4f46e5', display: 'block', marginBottom: '0.2rem' }}>
                          Interviewer Justification:
                        </strong>
                        <p style={{ fontSize: '0.82rem', color: '#334155', margin: 0, lineHeight: '1.5' }}>
                          {qf.feedback}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--border-radius-lg)',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <TrendingUp size={20} color="#4f46e5" />
              Actionable Growth Roadmap
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {finalReport.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', marginBottom: '0.35rem' }}>
                    STEP {idx + 1}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: '1.5' }}>{rec}</p>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setViewState('history');
                  fetchHistory();
                }}
              >
                View Past History
              </Button>
              <Button variant="primary" onClick={() => setViewState('setup')}>
                <RotateCcw size={16} style={{ marginRight: '0.4rem' }} />
                Retake Another Simulation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PAST INTERVIEWS HISTORY */}
      {viewState === 'history' && (
        <div className="animate-reveal">
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              borderRadius: 'var(--border-radius-lg)',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem' }}>
              Past Simulation Archive
            </h3>

            {isLoadingHistory ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading past records...</div>
            ) : historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <p>No interview simulations completed yet.</p>
                <Button variant="primary" onClick={() => setViewState('setup')} style={{ marginTop: '1rem' }}>
                  Start First Simulation
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historyList.map((item) => (
                  <div
                    key={item.session._id}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                        <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{item.session.companyName}</strong>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: '#4f46e5',
                          }}
                        >
                          {item.session.roundType?.replace(/_/g, ' ') || 'Simulation'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.session.jobRole}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        Date: {new Date(item.session.startedAt).toLocaleDateString()} | Status: {item.session.status}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                        Score: {item.session.overallScore !== undefined ? `${item.session.overallScore}/100` : 'N/A'}
                      </div>
                      {item.feedback?.hiringDecision && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color:
                              item.feedback.hiringDecision.includes('HIRE') && !item.feedback.hiringDecision.includes('NO')
                                ? '#059669'
                                : '#dc2626',
                          }}
                        >
                          {item.feedback.hiringDecision.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
