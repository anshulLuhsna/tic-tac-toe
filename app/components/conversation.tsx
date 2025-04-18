'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
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
    const availableMoves = this.availableMoves();
    
    if (availableMoves.length === 0) {
      return { idx: -1, score: 0 };
    }

    for (let idx of availableMoves) {
      this.board[idx] = player;
      const result = this.minimax(player === 'X' ? 'O' : 'X');
      moves.push({ idx, score: result.score });
      this.board[idx] = ' '; // Undo the move
    }

    if (player === 'X') {
      const bestMove = moves.reduce((best, move) => 
        move.score > best.score ? move : best, 
        { idx: -1, score: -Infinity }
      );
      return bestMove;
    } else {
      const bestMove = moves.reduce((best, move) => 
        move.score < best.score ? move : best, 
        { idx: -1, score: Infinity }
      );
      return bestMove;
    }
  }
}

export function Conversation() {
  const [board, setBoard] = useState(Array(9).fill(' '));
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [ttsMessage, setTtsMessage] = useState('');
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameRef = useRef(new TicTacToe());

  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  useEffect(() => {
    // Create audio element for TTS playback
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setIsPlayingTts(false);
    }
  }, []);

  // Generate and play TTS message
  const playTtsMessage = async (message: string) => {
    try {
      setIsPlayingTts(true);
      setTtsMessage(message);
      
      // Call the ElevenLabs API to generate TTS
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: message }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
      setIsPlayingTts(false);
    }
  };

  const clientTools = {
    makeMove: async ({ position }: { position: string }) => {
      console.log(`[makeMove] Player attempting move at position: ${position}`);
      const idx = parseInt(position, 10) - 1;
      const game = gameRef.current;
      
      // Validate move
      if (idx < 0 || idx > 8 || game.board[idx] !== ' ') {
        console.log(`[makeMove] Invalid move at position: ${position}`);
        return { isValidMove: false, board: [...game.board] };
      }
      
      // Make player's move
      game.makeMove(idx, 'X');
      console.log(`[makeMove] Player made move at position: ${position}, board: ${game.board.join('')}`);
      
      // Check for player win/tie
      let winner = game.winner();
      if (winner) {
        console.log(`[makeMove] Game ended after player move. Result: ${winner}`);
        const endMessage = winner === 'Tie' ? 'Tie game!' : `${winner === 'X' ? 'You' : 'I'} win!`;
        setStatus(endMessage);
        setBoard([...game.board]);
        
        // Stop the conversation and play TTS message
        await conversation.endSession();
        
        // Generate appropriate message based on game result
        let ttsText = "";
        if (winner === 'Tie') {
          ttsText = "It's a tie game! Well played, would you like to play again?";
        } else if (winner === 'X') {
          ttsText = `Congratulations ${userName}, you win! You're really good at this game!`;
        } else {
          ttsText = "I win this round! Better luck next time!";
        }
        
        // Play the TTS message
        await playTtsMessage(ttsText);
        
        return { isValidMove: true, board: [...game.board], winner };
      }

      // AI move
      console.log(`[makeMove] AI calculating move...`);
      const availableMoves = game.availableMoves();
      if (availableMoves.length > 0) {
        const { idx: aiIdx } = game.minimax('O');
        if (aiIdx >= 0 && aiIdx < 9 && game.board[aiIdx] === ' ') {
          game.makeMove(aiIdx, 'O');
          console.log(`[makeMove] AI made move at position: ${aiIdx + 1}`);
        } else {
          console.log(`[makeMove] AI attempted invalid move: ${aiIdx}`);
        }
      }
      
      // Final state after both moves
      setBoard([...game.board]);
      
      const postWinner = game.winner();
      console.log(`[makeMove] Board state after moves: ${game.board.join('')}`);

      if (postWinner) {
        console.log(`[makeMove] Game ended after AI move. Result: ${postWinner}`);
        const endMessage = postWinner === 'Tie' ? 'Tie game!' : `${postWinner === 'X' ? 'You' : 'I'} win!`;
        setStatus(endMessage);
        
        // Stop the conversation and play TTS message
        await conversation.endSession();
        
        // Generate appropriate message based on game result
        let ttsText = "";
        if (postWinner === 'Tie') {
          ttsText = "It's a tie game! Well played, would you like to play again?";
        } else if (postWinner === 'X') {
          ttsText = `Congratulations ${userName}, you win! You're really good at this game!`;
        } else {
          ttsText = "I win this round! Better luck next time!";
        }
        
        // Play the TTS message
        await playTtsMessage(ttsText);
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
      console.error('[startConversation] Failed to start:', err);
    }
  }, [conversation, userName]);

  const handleSubmitName = useCallback(() => {
    if (userName.trim()) {
      setShowModal(false);
      // Start conversation now that we have the user name
      startConversation();
    } else {
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
      <p className="text-black font-medium">{status || `Your turn, say a move (1–9).`}</p>

      {isPlayingTts && (
        <div className="mt-2 p-2 bg-blue-100 rounded">
          <p className="text-sm font-semibold">Playing message:</p>
          <p className="text-sm italic">{ttsMessage}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected' || isPlayingTts}
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
