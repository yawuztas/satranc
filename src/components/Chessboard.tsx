import React, { useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Config } from 'chessground/config';
import type { Key } from 'chessground/types';
import type { Color } from '../types/chess';
import type { DrawShape } from 'chessground/draw';

interface ChessboardProps {
  fen: string;
  orientation?: Color;
  interactive?: boolean;
  turnColor?: Color;
  dests?: Map<Key, Key[]>;
  onMove?: (orig: Key, dest: Key) => void;
  arrows?: [string, string, string?][]; // [from, to, color]
  highlightSquares?: string[];
  customShapes?: DrawShape[];
  lastMove?: Key[];
  check?: boolean;
  className?: string;
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  orientation = 'white',
  interactive = true,
  turnColor,
  dests,
  onMove,
  arrows = [],
  highlightSquares = [],
  customShapes = [],
  lastMove,
  check = false,
  className = '',
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const cgRef = useRef<Api | null>(null);

  // Keep latest onMove in ref synchronously to prevent stale closures
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // Compute legal destinations and side-to-move automatically when omitted
  const { effectiveTurnColor, effectiveDests } = useMemo(() => {
    let computedTurn: Color = turnColor ?? 'white';
    if (!turnColor) {
      try {
        computedTurn = new Chess(fen).turn() === 'b' ? 'black' : 'white';
      } catch {
        computedTurn = fen.split(' ')[1] === 'b' ? 'black' : 'white';
      }
    }

    if (dests !== undefined) {
      return { effectiveTurnColor: computedTurn, effectiveDests: dests };
    }

    const map = new Map<Key, Key[]>();
    if (!interactive) {
      return { effectiveTurnColor: computedTurn, effectiveDests: map };
    }

    try {
      const c = new Chess(fen);
      computedTurn = turnColor ?? (c.turn() === 'b' ? 'black' : 'white');
      c.moves({ verbose: true }).forEach((m) => {
        const from = m.from as Key;
        const to = m.to as Key;
        if (!map.has(from)) map.set(from, []);
        map.get(from)!.push(to);
      });
    } catch {
      // Invalid custom FEN leaves empty dests safely
    }
    return { effectiveTurnColor: computedTurn, effectiveDests: map };
  }, [fen, interactive, turnColor, dests]);

  // Convert custom arrows to Chessground DrawShape
  const computedShapes: DrawShape[] = React.useMemo(() => {
    const isValidKey = (k: any): k is Key => typeof k === 'string' && /^[a-h][1-8]$/.test(k);
    return [
      ...arrows
        .filter(([orig, dest]) => isValidKey(orig) && isValidKey(dest))
        .map(([orig, dest, brush]) => ({
          orig: orig as Key,
          dest: dest as Key,
          brush: brush || 'green',
        })),
      ...highlightSquares
        .filter(isValidKey)
        .map((sq) => ({
          orig: sq as Key,
          brush: 'paleBlue' as const,
        })),
      ...(customShapes || []).filter((s) => isValidKey(s.orig)),
    ];
  }, [arrows, highlightSquares, customShapes]);

  // Initialize Chessground
  useEffect(() => {
    if (!boardRef.current) return;

    const config: Config = {
      fen,
      orientation,
      turnColor: effectiveTurnColor,
      check,
      lastMove,
      coordinates: false,
      autoCastle: true,
      viewOnly: !interactive,
      movable: {
        free: false,
        color: interactive ? effectiveTurnColor : undefined,
        dests: interactive ? effectiveDests : new Map(),
        events: {
          after: (orig, dest) => {
            if (onMoveRef.current) {
              onMoveRef.current(orig, dest);
            }
          },
        },
      },
      draggable: {
        enabled: interactive,
        showGhost: false,
        distance: 3,
      },
      drawable: {
        enabled: true,
        visible: true,
        shapes: computedShapes,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    };

    cgRef.current = Chessground(boardRef.current, config);

    // ResizeObserver: only redraw if dimensions actually changed
    let lastWidth = 0;
    let lastHeight = 0;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && cgRef.current) {
        const { width, height } = entry.contentRect;
        if (Math.abs(width - lastWidth) > 2 || Math.abs(height - lastHeight) > 2) {
          lastWidth = width;
          lastHeight = height;
          window.requestAnimationFrame(() => {
            cgRef.current?.redrawAll();
          });
        }
      }
    });

    resizeObserver.observe(boardRef.current);

    return () => {
      resizeObserver.disconnect();
      cgRef.current?.destroy();
      cgRef.current = null;
    };
  }, []);

  // Update Chessground when props change
  useEffect(() => {
    if (!cgRef.current) return;

    cgRef.current.set({
      fen,
      orientation,
      turnColor: effectiveTurnColor,
      check,
      lastMove,
      viewOnly: !interactive,
      movable: {
        color: interactive ? effectiveTurnColor : undefined,
        dests: interactive ? effectiveDests : new Map(),
        events: {
          after: (orig, dest) => {
            if (onMoveRef.current) {
              onMoveRef.current(orig, dest);
            }
          },
        },
      },
      draggable: {
        enabled: interactive,
      },
      drawable: {
        shapes: computedShapes,
      },
    });
  }, [fen, orientation, effectiveTurnColor, interactive, effectiveDests, computedShapes, check, lastMove]);

  // Coordinate arrays based on board orientation
  const ranks = orientation === 'white'
    ? ['8', '7', '6', '5', '4', '3', '2', '1']
    : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const files = orientation === 'white'
    ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

  return (
    <div
      className={`relative w-full max-w-[620px] mx-auto select-none ${className}`}
      role="region"
      aria-label={`Satranç tahtası, ${orientation === 'white' ? 'beyaz' : 'siyah'} perspektifi`}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {interactive ? 'Hamle yapmak için taşları sürükleyin veya başlangıç ve hedef kareleri girin.' : 'Tahta görüntüleme modunda.'}
      </div>
      {/* Board with Left and Right Rank Numbers */}
      <div className="flex items-stretch">
        {/* Left Ranks (1-8) */}
        <div className="w-5 sm:w-6 grid grid-rows-8 text-[11px] sm:text-xs font-mono font-black text-amber-400/90 py-[3px]">
          {ranks.map((r) => (
            <span key={`l-${r}`} className="flex items-center justify-center">
              {r}
            </span>
          ))}
        </div>

        {/* The Chessground Board Canvas */}
        <div className="flex-1 aspect-square relative">
          <div
            ref={boardRef}
            className="cg-board-wrapper w-full h-full aspect-square"
          />
        </div>

        {/* Right Ranks (1-8) */}
        <div className="w-5 sm:w-6 grid grid-rows-8 text-[11px] sm:text-xs font-mono font-black text-amber-400/90 py-[3px]">
          {ranks.map((r) => (
            <span key={`r-${r}`} className="flex items-center justify-center">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Files (A-H) */}
      <div className="grid grid-cols-8 pl-5 sm:pl-6 pr-5 sm:pr-6 pt-1 text-[11px] sm:text-xs font-mono font-black text-amber-400/90">
        {files.map((f) => (
          <span key={f} className="text-center uppercase tracking-wider">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
};
