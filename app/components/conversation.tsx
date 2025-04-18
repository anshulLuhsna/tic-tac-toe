'use client';

import React, { useCallback, useRef, useState } from 'react';
import { useConversation } from '@11labs/react';

// Simple TicTacToe engine with Minimax
class TicTacToe {
  public board: string[];

  constructor() {
    this.board = Array(9).fill(' ');
  }

  availableMoves(): number[] {
    return this.board
      .map((c: string, i: number) => (c === ' ' ? i : null))
      .filter((i): i is number => i !== null);
  }

  makeMove(idx: number, player: string) {
    if (this.board[idx] === ' ') {
      this.board[idx] = player;
      return true;
    }
    return false;
  }

  winner(): string | null {
    const wins = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (let [a,b,c] of wins) {
      if (
        this.board[a] === this.board[b] &&
        this.board[b] === this.board[c] &&
        this.board[a] !== ' '
      ) {
        return this.board[a];
      }
    }
    return this.board.includes(' ') ? null : 'Tie';
  }

  minimax(player: string): { idx: number; score: number } {
    const win = this.winner();
    if (win === 'X') return { idx: -1, score: 1 };
    if (win === 'O') return { idx: -1, score: -1 };
    if (win === 'Tie') return { idx: -1, score: 0 };

    const moves: { idx: number; score: number }[] = [];
    for (let idx of this.availableMoves()) {
      this.board[idx] = player;
      const { score } = this.minimax(player === 'X' ? 'O' : 'X');
      moves.push({ idx, score });
      this.board[idx] = ' ';
    }

    if (player === 'X') {
      return moves.reduce((best, m) => (m.score > best.score ? m : best));
    } else {
      return moves.reduce((best, m) => (m.score < best.score ? m : best));
    }
  }
}

export function Conversation() {
  const [board, setBoard] = useState(Array(9).fill(' '));
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState('');
  const gameRef = useRef(new TicTacToe());

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const clientTools = {
    makeMove: async ({ position }: { position: string }) => {
      const idx = parseInt(position, 10) - 1;
      const game = gameRef.current;
      if (idx < 0 || idx > 8 || !game.makeMove(idx, 'X')) {
        return { isValidMove: false, board: [...game.board] };
      }

      // Check for player win/tie
      let winner = game.winner();
      if (winner) {
        setStatus(winner === 'Tie' ? 'Tie game!' : `${winner} wins!`);
        setBoard([...game.board]);
        return { isValidMove: true, board: [...game.board], winner };
      }

      // AI move
      const { idx: aiIdx } = game.minimax('O');
      game.makeMove(aiIdx, 'O');
      const postWinner = game.winner();

      setBoard([...game.board]);
      if (postWinner) {
        setStatus(postWinner === 'Tie' ? 'Tie game!' : `${postWinner} wins!`);
      }

      return { isValidMove: true, board: [...game.board], winner: postWinner || null };
    }
  };

  const startConversation = useCallback(async () => {
    if (!userName) {
      setShowModal(true);
      return;
    }

    gameRef.current = new TicTacToe();
    setBoard(Array(9).fill(' '));
    setStatus('');

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({
        agentId: 'EK03TEdzmpWUfU0TZdC9',
        clientTools: {
          makeMove: async ({ position }) => {
            const result = await clientTools.makeMove({ position });
            return result.board.join(''); // Convert board array to string
          }
        },
        dynamicVariables: { user_name: userName },
      });
    } catch (err) {
      console.error('Failed to start:', err);
    }
  }, [conversation, userName]);

  const handleSubmitName = useCallback(() => {
    if (userName.trim()) {
      setShowModal(false);
      // Start conversation now that we have the user name
      startConversation();
    }
  }, [userName, startConversation]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-3 gap-1">
        {board.map((cell, i) => (
          <div
            key={i}
            className="w-12 h-12 flex items-center justify-center border text-xl"
          >
            {cell}
          </div>
        ))}
      </div>
      <p>{status || `Your turn, say a move (1–9).`}</p>

      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
        >
          Stop Conversation
        </button>
      </div>

      <div>
        <p>Status: {conversation.status}</p>
        <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
      </div>

      {/* Name Input Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded-lg w-80">
            <h2 className="text-xl mb-4">Enter Your Name</h2>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full p-2 border rounded mb-4"
              placeholder="Your name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitName()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitName}
                className="px-4 py-2 bg-blue-500 text-white rounded"
                disabled={!userName.trim()}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
