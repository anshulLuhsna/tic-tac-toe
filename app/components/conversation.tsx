/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  MutableRefObject,
} from 'react';
import { useConversation } from '@elevenlabs/react';

/* ───────────────────── Tic-Tac-Toe engine ───────────────────── */
class TicTacToe {
  board: string[];

  constructor() {
    this.board = Array(9).fill(' ');
  }
  availableMoves() {
    return this.board
      .map((c, i) => (c === ' ' ? i : null))
      .filter((i): i is number => i !== null);
  }
  makeMove(idx: number, p: string) {
    if (this.board[idx] === ' ') {
      this.board[idx] = p;
      return true;
    }
    return false;
  }
  winner(): string | null {
    const wins = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of wins) {
      if (
        this.board[a] === this.board[b] &&
        this.board[b] === this.board[c] &&
        this.board[a] !== ' '
      )
        return this.board[a];
    }
    return this.board.includes(' ') ? null : 'Tie';
  }
  minimax(player: string): { idx: number; score: number } {
    const res = this.winner();
    if (res === 'X') return { idx: -1, score: 1 };
    if (res === 'O') return { idx: -1, score: -1 };
    if (res === 'Tie') return { idx: -1, score: 0 };

    const moves: { idx: number; score: number }[] = [];
    for (const idx of this.availableMoves()) {
      this.board[idx] = player;
      const { score } = this.minimax(player === 'X' ? 'O' : 'X');
      moves.push({ idx, score });
      this.board[idx] = ' ';
    }
    return player === 'X'
      ? moves.reduce((best, m) => (m.score > best.score ? m : best), { idx: -1, score: -Infinity })
      : moves.reduce((best, m) => (m.score < best.score ? m : best), { idx: -1, score: Infinity });
  }
}

/* ───────────────────── Main component ───────────────────── */
export default function Conversation() {
  const [board, setBoard]  = useState<string[]>(Array(9).fill(' '));
  const [status, setStatus] = useState('');
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsPreview, setTtsPreview] = useState('');
  const userName = 'Player'; // Default username

  const audioRef: MutableRefObject<HTMLAudioElement | null> = useRef(null);
  const gameRef = useRef(new TicTacToe());

  const conversation = useConversation({
    onConnect:   () => console.log('[EL] connected'),
    onDisconnect: () => console.log('[EL] disconnected'),
    onMessage:   (m) => console.log('[EL] message →', m),
    onError:     (e) => { console.error('[EL] error', e); alert('Conversation error – check console'); },
  });

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setIsPlayingTts(false);
    }
  }, []);

  const playTtsMessage = useCallback(async (text: string) => {
    try {
      setIsPlayingTts(true);
      setTtsPreview(text);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS request failed');
      audioRef.current!.src = URL.createObjectURL(await res.blob());
      audioRef.current!.play();
    } catch (err) {
      console.error('TTS error', err);
      setIsPlayingTts(false);
    }
  }, []);

  /* ───────────── client-tool implementation ───────────── */
  const makeMoveTool = useCallback(
    async ({ position }: { position: string }) => {
      const idx = Number(position) - 1;
      const g   = gameRef.current;

      /* invalid human move */
      if (idx < 0 || idx > 8 || g.board[idx] !== ' ') {
        return JSON.stringify({ boardStr: g.board.join(''), aiMove: null, winner: null });
      }

      /* human (O) */
      g.makeMove(idx, 'O');
      let winner = g.winner();

      /* AI (X) */
      let aiMove: number | null = null;
      if (!winner) {
        const { idx: ai } = g.minimax('X');
        if (ai !== -1) {
          g.makeMove(ai, 'X');
          aiMove = ai + 1;              // convert to 1-9 for LLM
        }
        winner = g.winner();
      }

      setBoard([...g.board]);

      if (winner) {
        await conversation.endSession();
        const line =
          winner === 'Tie'
            ? "It's a tie! Fancy another round?"
            : winner === 'O'
              ? `Nice one, ${userName}! You win 🎉`
              : 'Haha, I win! Want a rematch?';
        setStatus(line);
        await playTtsMessage(line);
      }

      return JSON.stringify({
        boardStr: g.board.join(''),
        aiMove,
        winner,
      });
    },
    [conversation, playTtsMessage, userName],
  );

  /* ───────────── start session ───────────── */
  const startConversation = useCallback(async () => {
    gameRef.current = new TicTacToe();
    setBoard(Array(9).fill(' '));
    setStatus('');

    await navigator.mediaDevices.getUserMedia({ audio: true });

    await conversation.startSession({
      agentId: 'agent_01jzfshenpernakmpv8b7s2mpe',        // ← paste real ID
      dynamicVariables: { user_name: userName },
      clientTools: {
        makeMove: async ({ moveRequest }: { moveRequest: { position: string } }) =>
          makeMoveTool({ position: moveRequest.position }),
      },
    });
  }, [conversation, userName, makeMoveTool]);

  const stopConversation = useCallback(() => conversation.endSession(), [conversation]);

  /* ───────────── UI ───────────── */
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="grid grid-cols-3 gap-1">
        {board.map((c, i) => (
          <div key={i} className="w-14 h-14 flex items-center justify-center border text-2xl font-mono">
            {c}
          </div>
        ))}
      </div>

      <p className="mt-2 font-semibold text-center">
        {status || 'Your move, O ⬆️'}
      </p>

      {isPlayingTts && (
        <div className="px-3 py-1 bg-blue-100 rounded text-sm italic">{ttsPreview}</div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected' || isPlayingTts}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Start
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-gray-400"
        >
          Stop
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {conversation.status} — agent is {conversation.isSpeaking ? 'speaking' : 'listening'}
      </p>
    </div>
  );
}
