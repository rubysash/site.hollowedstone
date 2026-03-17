// Fanorona — game constants

export const COLS = 9;
export const ROWS = 5;
export const PIECES_PER_PLAYER = 22;
export const DRAW_MOVE_LIMIT = 50;

export const PHASE = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

export const ACTION = {
  SELECT: 'select',    // choose a piece + capture direction
  MOVE: 'move',        // paika or start of capture chain
  CONTINUE: 'continue' // mid-chain capture
};
