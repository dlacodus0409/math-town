import { useState, type FormEvent } from 'react';
import { Play, Trophy } from 'lucide-react';

interface StartScreenProps {
  initialName: string;
  onStartGame: (name: string) => void;
  onOpenScores: () => void;
}

export function StartScreen({ initialName, onStartGame, onOpenScores }: StartScreenProps) {
  const [name, setName] = useState(initialName);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('학생 이름을 입력한 뒤 게임을 시작해 주세요.');
      return;
    }
    setErrorMsg('');
    onStartGame(trimmed);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/35">
      <div className="w-full max-w-md bg-white/95 rounded-2xl shadow-2xl border border-slate-200 p-7 sm:p-8 text-slate-900">
        <div className="space-y-2 mb-6">
          <p className="text-xs font-semibold text-blue-700 tracking-wide">
            초등학교 6학년 수학 · 비례식과 비례배분
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            비례 마을 수학 탐험
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            입체 마을을 걸어 다니며 10명의 마을 주민을 만나 보세요. 각 주민이 내는 비례와 비례배분 문제를 풀면 점수가 기록됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="student-name" className="block text-sm font-semibold text-slate-800 mb-1.5">
              학생 이름
            </label>
            <input
              id="student-name"
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="이름을 입력하세요 (예: 김하늘)"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
            />
            {errorMsg && (
              <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              게임 시작하기
            </button>
            <button
              type="button"
              onClick={onOpenScores}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold text-sm border border-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              점수 보기
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>이동: 방향키 / WASD</span>
          <span aria-hidden="true">·</span>
          <span>대화: 스페이스바</span>
          <span aria-hidden="true">·</span>
          <span>정답 +10점 / 총 100점</span>
        </div>
      </div>
    </div>
  );
}
