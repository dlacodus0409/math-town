import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { fetchScoresFromSheetDB } from '../services/sheetdb';
import type { ScoreEntry } from '../types/game';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightName?: string;
}

export function ScoreboardModal({ isOpen, onClose, highlightName }: ScoreboardModalProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScoresFromSheetDB();
      setScores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '점수를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadScores();
    }
  }, [isOpen, loadScores]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/55">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scoreboard-title"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-600 shrink-0" />
            <h2 id="scoreboard-title" className="font-display text-lg font-bold text-slate-900">
              학생 점수 기록표
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadScores()}
              disabled={loading}
              title="새로고침"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && scores.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              점수 기록을 불러오는 중입니다...
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => void loadScores()}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                다시 불러오기
              </button>
            </div>
          ) : scores.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              아직 기록된 점수가 없습니다. 첫 번째 도전자에 이름을 올려 보세요!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-2.5 px-3 w-16">순위</th>
                  <th className="py-2.5 px-3">이름</th>
                  <th className="py-2.5 px-3 text-right">점수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {scores.map((entry, index) => {
                  const isHighlighted =
                    highlightName &&
                    entry.이름.toLowerCase() === highlightName.trim().toLowerCase();
                  return (
                    <tr
                      key={`${entry.이름}-${entry.orderIndex}`}
                      className={isHighlighted ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-3 font-mono-num text-slate-600">{index + 1}</td>
                      <td className="py-3 px-3 text-slate-900">{entry.이름}</td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-blue-700">
                        {entry.점수}점
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>총 {scores.length}건 기록됨</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
