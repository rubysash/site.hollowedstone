// Nine Men's Morris — game constants

export const PIECES_PER_PLAYER = 9;
export const MIN_PIECES_TO_PLAY = 3;
export const DRAW_MOVE_LIMIT = 50; // moves without capture → draw

export const PHASE = {
  WAITING:  'waiting',
  PLACING:  'placing',
  PLAYING:  'playing',
  FINISHED: 'finished'
};

// Turn action sub-phases
export const ACTION = {
  PLACE:  'place',   // placement phase: put a piece on any empty node
  MOVE:   'move',    // movement phase: slide (or fly) a piece
  REMOVE: 'remove'   // after forming a mill: pick an opponent piece to remove
};
