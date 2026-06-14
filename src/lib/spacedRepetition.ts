/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flashcard } from '../types';

export interface SM2Flashcard extends Flashcard {
  repetitions?: number;
  easeFactor?: number;
  interval?: number;
  dueDate?: string;
}

/**
 * SuperMemo SM-2 Spaced Repetition Scheduling Algorithm
 * Takes a Flashcard and a rating (0 = Again, 1 = Hard, 2 = Good, 3 = Easy)
 * and returns the updated deck card scheduling parameters.
 */
export function scheduleFlashcard(card: SM2Flashcard, rating: 0 | 1 | 2 | 3): SM2Flashcard {
  let repetitions = card.repetitions ?? 0;
  let easeFactor = card.easeFactor ?? 2.5;
  let interval = card.interval ?? 0;

  // Map 0-3 slider ratings to SM-2 quality grades (0-5 scale):
  // 0 (Again) -> 0 (Complete blackout/Again)
  // 1 (Hard)  -> 2 (Incorrect response but easily recalled/Hard)
  // 2 (Good)  -> 4 (Correct response after hesitation/Good)
  // 3 (Easy)  -> 5 (Perfect response/Easy)
  let quality = 0;
  if (rating === 1) quality = 2;
  else if (rating === 2) quality = 4;
  else if (rating === 3) quality = 5;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  // Adjust EF based on answer quality
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  return {
    ...card,
    lastReviewed: new Date().toISOString(),
    confidence: rating,
    repetitions,
    easeFactor,
    interval,
    dueDate: dueDate.toISOString()
  };
}

/**
 * Filter and get all flashcards due for review today
 */
export function filterDueCards(cards: SM2Flashcard[]): SM2Flashcard[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // include anything due today

  return cards.filter((card) => {
    if (!card.dueDate) return true; // New cards are due immediately
    return new Date(card.dueDate) <= now;
  });
}
