import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react';
import type { AnsweredRecord, NpcProfile } from '../types/game';

interface QuizModalProps {
  npc: NpcProfile;
  existingRecord?: AnsweredRecord;
  solvedCountAfterThis: number;
  totalQuestions: number;
  onSubmitAnswer: (npc: NpcProfile, selectedIndex: number) => AnsweredRecord;
  onClose: () => void;
}

export function QuizModal({
  npc,
  existingRecord,
  solvedCountAfterThis,
  totalQuestions,
  onSubmitAnswer,
  onClose,
}: QuizModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    existingRecord ? existingRecord.selectedIndex : null
  );
  const [submittedRecord, setSubmittedRecord] = useState<AnsweredRecord | null>(
    existingRecord ?? null
  );

  // Sync if opening a different NPC
  useEffect(() => {
    setSelectedIndex(existingRecord ? existingRecord.selectedIndex : null);
    setSubmittedRecord(existingRecord ?? null);
  }, [npc.id, existingRecord]);

  const handleConfirm = () => {
    if (submittedRecord || selectedIndex === null) return;
    const record = onSubmitAnswer(npc, selectedIndex);
    setSubmittedRecord(record);
  };

  // Keyboard shortcuts: 1-4 to pick option, Enter to submit or continue
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4' && !submittedRecord) {
        setSelectedIndex(Number(e.key) - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!submittedRecord && selectedIndex !== null) {
          const record = onSubmitAnswer(npc, selectedIndex);
          setSubmittedRecord(record);
        } else if (submittedRecord) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [npc, selectedIndex, submittedRecord, onSubmitAnswer, onClose]);

  const { question } = npc;
  const isCompletedAll = submittedRecord !== null && solvedCountAfterThis >= totalQuestions;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/50">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-npc-name"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{npc.role}</span>
              <span aria-hidden="true">·</span>
              <span>문제 {question.id}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-blue-700">{question.topic}</span>
            </div>
            <h2 id="quiz-npc-name" className="font-display text-lg font-bold text-slate-900 mt-0.5">
              {npc.name}
            </h2>
          </div>
          {!submittedRecord && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              나중에 풀기
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* NPC Greeting */}
          <div className="flex items-start gap-2.5 text-sm text-slate-600 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{npc.greeting}</p>
          </div>

          {/* Math Prompt */}
          <div>
            <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
              {question.prompt}
            </p>
            {!submittedRecord && (
              <p className="mt-1.5 text-xs text-slate-500">
                각 문제는 처음 제출한 답만 채점됩니다 (정답 +10점, 오답 0점).
              </p>
            )}
          </div>

          {/* 4 Multiple Choice Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selectedIndex === idx;
              const isCorrectOption = idx === question.correctIndex;

              let btnStyle =
                'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-slate-800';
              if (submittedRecord) {
                if (isCorrectOption) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
                } else if (isSelected && !isCorrectOption) {
                  btnStyle = 'border-red-400 bg-red-50 text-red-900';
                } else {
                  btnStyle = 'border-slate-200 bg-slate-50 text-slate-400';
                }
              } else if (isSelected) {
                btnStyle = 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-2 ring-blue-600/20';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={submittedRecord !== null}
                  onClick={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm sm:text-base transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-mono-num text-xs font-semibold text-slate-700 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback & Explanation after first submission */}
          {submittedRecord && (
            <div
              className={`rounded-xl p-4 border space-y-2 ${
                submittedRecord.isCorrect
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50 border-amber-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {submittedRecord.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800">정답입니다! (+10점)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      <span className="text-red-700">아쉬워요! (0점)</span>
                    </>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  정답: {question.options[question.correctIndex]}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{question.explanation}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          {!submittedRecord ? (
            <button
              type="button"
              disabled={selectedIndex === null}
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:text-slate-500 text-white font-semibold text-sm transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              정답 제출하기
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isCompletedAll ? '최종 결과 보기' : '마을로 돌아가기'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
