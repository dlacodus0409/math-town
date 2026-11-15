import type { ScoreEntry } from '../types/game';

const SHEETDB_URL = 'https://sheetdb.io/api/v1/icjnsp7k8qcs5';

export async function saveScoreToSheetDB(name: string, score: number): Promise<void> {
  const cleanName = name.trim();
  const payload = {
    data: [
      {
        이름: cleanName,
        점수: score,
      },
    ],
  };

  const response = await fetch(SHEETDB_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`점수 저장 실패 (HTTP ${response.status})`);
  }
}

export async function fetchScoresFromSheetDB(): Promise<ScoreEntry[]> {
  const response = await fetch(SHEETDB_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`점수 불러오기 실패 (HTTP ${response.status})`);
  }

  const rawData: unknown = await response.json();
  if (!Array.isArray(rawData)) {
    return [];
  }

  const entries: ScoreEntry[] = [];
  rawData.forEach((row, idx) => {
    if (row && typeof row === 'object') {
      const record = row as Record<string, unknown>;
      const rawName = record['이름'];
      const rawScore = record['점수'];
      const nameStr = typeof rawName === 'string' ? rawName.trim() : String(rawName ?? '').trim();
      if (!nameStr) return;

      const parsedScore = Number(rawScore);
      entries.push({
        이름: nameStr,
        점수: Number.isFinite(parsedScore) ? parsedScore : 0,
        rawScore: typeof rawScore === 'number' || typeof rawScore === 'string' ? rawScore : 0,
        orderIndex: idx,
      });
    }
  });

  // Sort by highest score first, then most recently added (higher orderIndex)
  entries.sort((a, b) => {
    if (b.점수 !== a.점수) return b.점수 - a.점수;
    return b.orderIndex - a.orderIndex;
  });

  return entries;
}
