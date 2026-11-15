import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Trophy, Volume2, VolumeX } from 'lucide-react';
import { QuizModal } from './components/QuizModal';
import { ResultScreen, type SaveStatus } from './components/ResultScreen';
import { ScoreboardModal } from './components/ScoreboardModal';
import { StartScreen } from './components/StartScreen';
import { VILLAGE_NPCS } from './data/questions';
import { saveScoreToSheetDB } from './services/sheetdb';
import { VillageScene } from './three/VillageScene';
import type { AnsweredRecord, GamePhase, NpcProfile, ProximityInfo } from './types/game';
import { soundEngine } from './utils/audio';

export default function App() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('start');
  const [playerName, setPlayerName] = useState('');
  const [recordsByNpc, setRecordsByNpc] = useState<Record<string, AnsweredRecord>>({});
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [proximity, setProximity] = useState<ProximityInfo | null>(null);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [webglError, setWebglError] = useState(false);

  // SheetDB save state on completion
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasSavedThisRunRef = useRef(false);

  const virtualMoveRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });

  const recordsList = useMemo(() => Object.values(recordsByNpc), [recordsByNpc]);
  const solvedNpcIds = useMemo(() => Object.keys(recordsByNpc), [recordsByNpc]);
  const totalScore = useMemo(
    () => recordsList.reduce((acc, rec) => acc + rec.pointsEarned, 0),
    [recordsList]
  );

  const activeNpc = useMemo(
    () => VILLAGE_NPCS.find((n) => n.id === activeNpcId) ?? null,
    [activeNpcId]
  );

  const persistScore = useCallback(async (name: string, score: number) => {
    setSaveStatus('saving');
    setSaveError(null);
    try {
      await saveScoreToSheetDB(name, score);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err instanceof Error ? err.message : '점수 저장에 실패했습니다.');
    }
  }, []);

  const handleStartGame = useCallback((name: string) => {
    setPlayerName(name);
    setRecordsByNpc({});
    setActiveNpcId(null);
    setProximity(null);
    setSaveStatus('idle');
    setSaveError(null);
    hasSavedThisRunRef.current = false;
    setResetSignal((n) => n + 1);
    setGamePhase('playing');
  }, []);

  const handleTalkTrigger = useCallback((npcId: string) => {
    soundEngine.playTalkOpen();
    setActiveNpcId(npcId);
    setGamePhase('quiz');
  }, []);

  const handleSubmitAnswer = useCallback(
    (npc: NpcProfile, selectedIndex: number): AnsweredRecord => {
      // Grade only the first submission for each NPC
      const existing = recordsByNpc[npc.id];
      if (existing) {
        return existing;
      }

      const isCorrect = selectedIndex === npc.question.correctIndex;
      const pointsEarned = isCorrect ? 10 : 0;

      if (isCorrect) {
        soundEngine.playCorrect();
      } else {
        soundEngine.playWrong();
      }

      const record: AnsweredRecord = {
        npcId: npc.id,
        npcName: npc.name,
        questionId: npc.question.id,
        topic: npc.question.topic,
        prompt: npc.question.prompt,
        options: npc.question.options,
        selectedIndex,
        correctIndex: npc.question.correctIndex,
        isCorrect,
        pointsEarned,
        explanation: npc.question.explanation,
      };

      setRecordsByNpc((prev) => {
        if (prev[npc.id]) return prev;
        return { ...prev, [npc.id]: record };
      });

      return record;
    },
    [recordsByNpc]
  );

  const handleCloseQuiz = useCallback(() => {
    setActiveNpcId(null);
    const solvedCount = Object.keys(recordsByNpc).length;
    if (solvedCount >= VILLAGE_NPCS.length) {
      setGamePhase('result');
      soundEngine.playComplete();
      if (!hasSavedThisRunRef.current) {
        hasSavedThisRunRef.current = true;
        const finalScore = Object.values(recordsByNpc).reduce(
          (sum, r) => sum + r.pointsEarned,
          0
        );
        void persistScore(playerName, finalScore);
      }
    } else {
      setGamePhase('playing');
    }
  }, [recordsByNpc, playerName, persistScore]);

  const handlePlayAgain = useCallback(() => {
    setRecordsByNpc({});
    setActiveNpcId(null);
    setProximity(null);
    setSaveStatus('idle');
    setSaveError(null);
    hasSavedThisRunRef.current = false;
    setResetSignal((n) => n + 1);
    setGamePhase('start');
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.muted = next;
      return next;
    });
  }, []);

  const setVirtualMove = (x: number, z: number) => {
    virtualMoveRef.current.x = x;
    virtualMoveRef.current.z = z;
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-sky-100">
      {/* 3D Village Canvas */}
      {!webglError ? (
        <VillageScene
          gamePhase={gamePhase}
          paused={isScoreboardOpen}
          solvedNpcIds={solvedNpcIds}
          resetSignal={resetSignal}
          virtualMoveRef={virtualMoveRef}
          onProximityChange={setProximity}
          onTalkTrigger={handleTalkTrigger}
          onWebglError={() => setWebglError(true)}
        />
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-sky-100 text-slate-800 p-6">
          <div className="max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-lg text-center space-y-2">
            <h2 className="font-display text-lg font-bold">3D 화면을 불러올 수 없습니다</h2>
            <p className="text-sm text-slate-600">
              브라우저에서 WebGL 가속이 꺼져 있는지 확인한 뒤 새로고침해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* Playing HUD (Unobstructed center viewport) */}
      {(gamePhase === 'playing' || gamePhase === 'quiz') && (
        <>
          {/* Top-Left Compact Score & Progress Strip */}
          <div className="fixed top-4 left-4 z-10 pointer-events-auto">
            <div className="bg-white/95 border border-slate-200 rounded-xl shadow-md px-4 py-2.5 flex items-center gap-3 text-sm text-slate-900">
              <span className="font-bold text-slate-900">{playerName}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600">
                문제{' '}
                <strong className="font-mono-num text-slate-900">
                  {recordsList.length} / {VILLAGE_NPCS.length}
                </strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-600">
                점수 <strong className="font-mono-num text-blue-700">{totalScore}점</strong>
              </span>
            </div>
          </div>

          {/* Top-Right Compact Utility Controls */}
          <div className="fixed top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsScoreboardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 shadow-md text-xs font-semibold text-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              점수 보기
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? '소리 켜기' : '소리 끄기'}
              title={isMuted ? '소리 켜기' : '소리 끄기'}
              className="p-2.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 shadow-md text-slate-700 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}

      {/* Proximity Prompt: "스페이스바로 대화" */}
      {gamePhase === 'playing' && proximity && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <button
            type="button"
            onClick={() => handleTalkTrigger(proximity.npcId)}
            className={`inline-flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-xl border font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap ${
              proximity.solved
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <MessageCircle
              className={`w-4 h-4 shrink-0 ${
                proximity.solved ? 'text-emerald-600' : 'text-amber-400'
              }`}
            />
            {proximity.solved ? (
              <span>
                {proximity.npcName} · 완료됨 (스페이스바로 해설 보기)
              </span>
            ) : (
              <span>
                스페이스바로 대화 — {proximity.npcName}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Bottom-Center Collapsible Controls Bar */}
      {gamePhase === 'playing' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-auto">
          <button
            type="button"
            onClick={() => setControlsCollapsed((prev) => !prev)}
            className="mb-1 inline-flex items-center gap-1 px-3 py-1 rounded-t-lg bg-white/90 border border-b-0 border-slate-200 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            {controlsCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3" />
                조작 안내 보기
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                조작 안내 접기
              </>
            )}
          </button>
          {!controlsCollapsed && (
            <div className="bg-white/95 border border-slate-200 rounded-xl shadow-md px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>
                <strong className="text-slate-900">WASD / 방향키</strong> 걷기
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-slate-900">스페이스바</strong> NPC 대화
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-slate-900">마우스 드래그</strong> 시점 회전
              </span>
            </div>
          )}
        </div>
      )}

      {/* Touch / Mobile D-Pad */}
      {gamePhase === 'playing' && (
        <div className="fixed bottom-16 left-4 z-10 md:hidden grid grid-cols-3 gap-1 w-28 h-28 pointer-events-auto">
          <div />
          <button
            type="button"
            onPointerDown={() => setVirtualMove(0, -1)}
            onPointerUp={() => setVirtualMove(0, 0)}
            onPointerLeave={() => setVirtualMove(0, 0)}
            className="bg-white/90 border border-slate-300 rounded-lg font-bold text-slate-800 active:bg-blue-100"
          >
            ↑
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => setVirtualMove(-1, 0)}
            onPointerUp={() => setVirtualMove(0, 0)}
            onPointerLeave={() => setVirtualMove(0, 0)}
            className="bg-white/90 border border-slate-300 rounded-lg font-bold text-slate-800 active:bg-blue-100"
          >
            ←
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => setVirtualMove(1, 0)}
            onPointerUp={() => setVirtualMove(0, 0)}
            onPointerLeave={() => setVirtualMove(0, 0)}
            className="bg-white/90 border border-slate-300 rounded-lg font-bold text-slate-800 active:bg-blue-100"
          >
            →
          </button>
          <div />
          <button
            type="button"
            onPointerDown={() => setVirtualMove(0, 1)}
            onPointerUp={() => setVirtualMove(0, 0)}
            onPointerLeave={() => setVirtualMove(0, 0)}
            className="bg-white/90 border border-slate-300 rounded-lg font-bold text-slate-800 active:bg-blue-100"
          >
            ↓
          </button>
          <div />
        </div>
      )}

      {/* Start Screen */}
      {gamePhase === 'start' && (
        <StartScreen
          initialName={playerName}
          onStartGame={handleStartGame}
          onOpenScores={() => setIsScoreboardOpen(true)}
        />
      )}

      {/* Quiz Modal */}
      {gamePhase === 'quiz' && activeNpc && (
        <QuizModal
          npc={activeNpc}
          existingRecord={recordsByNpc[activeNpc.id]}
          solvedCountAfterThis={recordsList.length}
          totalQuestions={VILLAGE_NPCS.length}
          onSubmitAnswer={handleSubmitAnswer}
          onClose={handleCloseQuiz}
        />
      )}

      {/* Result Screen */}
      {gamePhase === 'result' && (
        <ResultScreen
          playerName={playerName}
          score={totalScore}
          records={recordsList}
          saveStatus={saveStatus}
          saveError={saveError}
          onRetrySave={() => void persistScore(playerName, totalScore)}
          onOpenScores={() => setIsScoreboardOpen(true)}
          onPlayAgain={handlePlayAgain}
        />
      )}

      {/* Scoreboard Modal */}
      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        highlightName={playerName}
      />
    </div>
  );
}
