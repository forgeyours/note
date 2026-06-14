/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { listFlashcardDecks, saveFlashcardDeck } from '../../lib/db';
import { FlashcardDeck, Flashcard } from '../../types';
import { scheduleFlashcard, filterDueCards, SM2Flashcard } from '../../lib/spacedRepetition';
import { X, PlayCircle, PlusCircle, Award, CheckCircle2, ChevronRight, CornerDownRight, HelpCircle, Save, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface FlashcardModalProps {
  onClose: () => void;
}

export default function FlashcardModal({ onClose }: FlashcardModalProps) {
  const store = useAppStore();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

  // Review mode state
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [dueCards, setDueCards] = useState<SM2Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardsReviewedCount, setCardsReviewedCount] = useState(0);

  // Creation state
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const activeNotebookId = store.activeNotebookId;

  const refreshDecks = async () => {
    if (!activeNotebookId) return;
    try {
      const allDecks = await listFlashcardDecks(activeNotebookId);
      setDecks(allDecks);
      
      // Auto create a default deck if none matches
      if (allDecks.length === 0) {
        const defaultDeck: FlashcardDeck = {
          id: `deck-${activeNotebookId}`,
          notebookId: activeNotebookId,
          name: 'General Review Deck',
          cards: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await saveFlashcardDeck(defaultDeck);
        setDecks([defaultDeck]);
        setActiveDeck(defaultDeck);
      } else {
        if (!activeDeck) {
          setActiveDeck(allDecks[0]);
        } else {
          const current = allDecks.find(d => d.id === activeDeck.id);
          if (current) setActiveDeck(current);
        }
      }
    } catch (e) {
      console.error('Failed to load flashcard decks', e);
    }
  };

  useEffect(() => {
    refreshDecks();
  }, [activeNotebookId]);

  // Start due revision
  const handleStartReview = () => {
    if (!activeDeck) return;
    const due = filterDueCards(activeDeck.cards as SM2Flashcard[]);
    if (due.length === 0) {
      toast.success('Congratulations! You completed all cards due today.');
      return;
    }

    setDueCards(due);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setCardsReviewedCount(0);
    setIsReviewMode(true);
  };

  // SM-2 Schedule triggers
  const handleReviewAnswer = async (rating: 0 | 1 | 2 | 3) => {
    if (!activeDeck || dueCards.length === 0) return;

    const currentCard = dueCards[currentCardIndex];
    const updatedCard = scheduleFlashcard(currentCard, rating);

    // Save modified card inside the activeDeck
    const updatedCards = activeDeck.cards.map((c) =>
      c.id === currentCard.id ? updatedCard : c
    );

    const updatedDeck: FlashcardDeck = {
      ...activeDeck,
      cards: updatedCards,
      updatedAt: new Date().toISOString()
    };

    await saveFlashcardDeck(updatedDeck);
    setActiveDeck(updatedDeck);

    // Advance queue
    setCardsReviewedCount((prev) => prev + 1);
    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Completed last due card!
      setIsReviewMode(false);
      toast.success('Spaced learning segment finished!');
      refreshDecks();
    }
  };

  // Create new flashcard
  const handleCreateCard = async () => {
    if (!activeDeck || !newFront.trim() || !newBack.trim()) {
      toast.error('Draw context/Both text front and back fields are required');
      return;
    }

    const newCard: Flashcard = {
      id: `card-${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      lastReviewed: null,
      confidence: 0
    };

    const updatedDeck: FlashcardDeck = {
      ...activeDeck,
      cards: [...activeDeck.cards, newCard],
      updatedAt: new Date().toISOString()
    };

    await saveFlashcardDeck(updatedDeck);
    setActiveDeck(updatedDeck);
    setNewFront('');
    setNewBack('');
    setIsCreateMode(false);
    toast.success('New card added successfully!');
    refreshDecks();
  };

  const currentCard = dueCards[currentCardIndex];

  return (
    <div className="flex flex-col h-full overflow-hidden text-left" id="active-flashcards-modal">
      
      {/* Dynamic Queue header panels */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <Layers className="text-amber-500" size={18} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
            {isReviewMode ? 'Daily Study Deck' : 'Memorisation Decks'}
          </h2>
        </div>
        <button 
          onClick={onClose} 
          className="p-1 hover:bg-bg-secondary rounded text-text-muted hover:text-text-primary focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col justify-center">
        {isReviewMode && currentCard ? (
          // ACTIVE STUDY CARD COMPONENT FRAME (SM-2)
          <div className="flex flex-col space-y-4 max-w-md w-full mx-auto" id="active-sm2-card-card">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-text-muted">
              <span>Card {currentCardIndex + 1} of {dueCards.length}</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">SM-2 Due Today</span>
            </div>

            {/* Front Question Face */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[160px] text-center prose">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-text-muted mb-2">Front Side</span>
              <p className="text-sm font-bold text-text-primary whitespace-pre-wrap">{currentCard.front}</p>
            </div>

            {/* Back Answer (Collapsible details) */}
            {showAnswer ? (
              <div className="bg-brand-light border border-brand-primary/20 rounded-xl p-8 flex flex-col items-center justify-center min-h-[150px] text-center fade-in text-brand-primary">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#E85D00] mb-2">Back Side (Concept answer)</span>
                <p 
                  className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: currentCard.back }} 
                />
              </div>
            ) : (
              <button
                onClick={() => setShowAnswer(true)}
                className="w-full py-3.5 bg-brand-primary text-white font-bold rounded-xl shadow-md cursor-pointer hover:bg-brand-hover active:scale-98 transition-all"
              >
                Reveal Answer
              </button>
            )}

            {/* Dynamic Confidence scheduling ratings buttons */}
            {showAnswer && (
              <div className="flex flex-col space-y-2 fade-in pt-2">
                <span className="text-[10px] text-center font-bold uppercase text-text-muted tracking-wide">Confidence rating</span>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleReviewAnswer(0)}
                    className="py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-all"
                  >
                    Again (1m)
                  </button>
                  <button
                    onClick={() => handleReviewAnswer(1)}
                    className="py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-all"
                  >
                    Hard (1d)
                  </button>
                  <button
                    onClick={() => handleReviewAnswer(2)}
                    className="py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-all"
                  >
                    Good (4d)
                  </button>
                  <button
                    onClick={() => handleReviewAnswer(3)}
                    className="py-2.5 rounded-xl border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold transition-all"
                  >
                    Easy (9d)
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isCreateMode ? (
          // CREATE NEW FLASHCARD INTERFACE
          <div className="flex flex-col space-y-4 max-w-sm w-full mx-auto" id="create-flashcard-inputs">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Configure study deck card</h3>
            
            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold text-text-secondary">Front Side (Question / Recall Prompt)</label>
              <textarea
                placeholder="Write question text (e.g. What is gravity constant?)"
                rows={3}
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] uppercase font-bold text-text-secondary">Back Side (Correct Knowledge / Proof)</label>
              <textarea
                placeholder="HTML rich text or standard text values..."
                rows={3}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handleCreateCard}
                className="flex-1 py-1.5 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-hover"
              >
                Save Card
              </button>
              <button
                onClick={() => setIsCreateMode(false)}
                className="px-3 py-1.5 hover:bg-bg-secondary text-text-muted text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // STATS & MAIN INTERFACE
          <div className="flex flex-col space-y-4 max-w-md w-full mx-auto" id="flashcard-deck-overview">
            {activeDeck ? (
              <div className="flex flex-col space-y-4 p-2">
                <div className="p-4 bg-bg-secondary rounded-xl border border-gray-100">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wide">Study Deck details</span>
                  <div className="flex justify-between items-center text-xs mt-2 text-text-secondary">
                    <span>Active deck:</span>
                    <span className="font-bold text-text-primary">{activeDeck.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 text-text-secondary">
                    <span>Total deck cards:</span>
                    <span className="font-bold text-brand-primary">{activeDeck.cards?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 text-text-secondary">
                    <span>Due for review today:</span>
                    <span className="font-bold text-amber-600">
                      {filterDueCards(activeDeck.cards as SM2Flashcard[]).length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    onClick={handleStartReview}
                    className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md"
                  >
                    <PlayCircle size={15} />
                    <span>Start Spaced Review</span>
                  </button>

                  <button
                    onClick={() => setIsCreateMode(true)}
                    className="py-2.5 px-3.5 border border-gray-200 hover:bg-bg-secondary text-text-secondary font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                  >
                    <PlusCircle size={14} className="text-brand-primary" />
                    <span>Add Card</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <HelpCircle size={32} className="text-text-muted m-auto animate-bounce" />
                <p className="text-xs text-text-secondary mt-2">Active Deck initializing...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
