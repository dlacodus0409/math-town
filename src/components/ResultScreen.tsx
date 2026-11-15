import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import type { AnsweredRecord } from '../types/game';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ResultScreenProps {
  playerName: string;
  score: number;
  records: AnsweredRecord[];
  saveStatus: SaveStatus;
  saveError: string | null;
  onRetrySave: () => void;
  onOpenScores: () => void;
  onPlayAgain: () => void;
}

export function ResultScreen({
  playerName,
  score,
  records,
  saveStatus,
  saveError,
  onRetrySave,
  onOpenScores,
  onPlayAgain,
}: ResultScreenProps) {
  const correctCount = records.filter((r) => r.isCorrect).length;
  const sortedRecords = [...records].sort((a, b) => a.questionId - b.questionId);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/60">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
        {/* Header Summary */}
        <div className="p-6 sm:p-7 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-blue-700">비례 마을 탐험 완료</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
                {playerName} 학생의 결과
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                10문제를 모두 풀었어요 · 맞힌 문제{' '}
                <span className="font-mono-num font-semibold text-slate-900">
                  {correctCount} / {records.length}
                </span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-500">최종 점수</div>
              <div className="font-display font-mono-num text-4xl font-extrabold text-blue-700">
                {score}점
              </div>
            </div>
          </div>

          {/* SheetDB Save Status */}
          <div className="mt-4 pt-3.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            {saveStatus === 'saving' && (
              <span className="text-slate-600 font-medium">
                점수 기록표에 이름과 점수를 저장하는 중입니다...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                이름({playerName})과 점수({score}점)가 기록표에 저장되었습니다.
              </span>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <span>저장 실패: {saveError ?? '네트워크 오류'}</span>
                <button
                  type="button"
                  onClick={onRetrySave}
                  className="px-2.5 py-1 rounded bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  다시 저장
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Review List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 mb-2">문제별 풀이 및 해설</h3>
          {sortedRecords.map((rec) => (
            <div
              key={rec.npcId}
              className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-500">
                  문제 {rec.questionId} · {rec.topic} ({rec.npcName})
                </span>
                {rec.isCorrect ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    정답 (+10점)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                    <XCircle className="w-3.5 h-3.5" />
                    오답 (0점)
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-900">{rec.prompt}</p>
              <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>내 답: {rec.options[rec.selectedIndex]}</span>
                <span className="font-semibold text-blue-700">
                  정답: {rec.options[rec.correctIndex]}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">{rec.explanation}</p>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onOpenScores}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            점수 보기
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            처음으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
