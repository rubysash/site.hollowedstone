// Seega -- game constants

export const BOARD_SIZE = 5;
export const PIECES_PER_PLAYER = 12;
export const PIECES_PER_PLACEMENT_TURN = 2;
export const DEFAULT_MOVE_LIMIT = 20;

export const FILES = ['a','b','c','d','e'];
export const RANKS = ['1','2','3','4','5'];
export const CENTER = 'c3';

export const PHASE = {
  WAITING: 'waiting',
  PLACING: 'placing',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

export const ACTION = {
  PLACE: 'place',
  MOVE: 'move'
};
