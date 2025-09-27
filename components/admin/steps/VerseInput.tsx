'use client'

import React from 'react'
import VerseEditor from '../VerseEditor'

interface VerseInputProps {
  verse: string
  words: any[]
  wordGroups: any[]
  gameParticipatingWords?: number[]
  wordColors?: { [key: number]: string }
  onVerseChange: (verse: string) => void
  onWordsChange: (words: any[]) => void
  onWordGroupsChange: (wordGroups: any[]) => void
  onGameParticipatingWordsChange?: (participatingWords: number[]) => void
  onWordColorsChange?: (wordColors: { [key: number]: string }) => void
}

export default function VerseInput({
  verse,
  words,
  wordGroups,
  gameParticipatingWords,
  wordColors,
  onVerseChange,
  onWordsChange,
  onWordGroupsChange,
  onGameParticipatingWordsChange,
  onWordColorsChange
}: VerseInputProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Vers du poème
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Saisissez le vers de votre poème et analysez-le pour extraire les mots.
        </p>
      </div>

      <VerseEditor
        verse={verse}
        words={words}
        wordGroups={wordGroups}
        gameParticipatingWords={gameParticipatingWords}
        wordColors={wordColors}
        onVerseChange={onVerseChange}
        onWordsChange={onWordsChange}
        onWordGroupsChange={onWordGroupsChange}
        onGameParticipatingWordsChange={onGameParticipatingWordsChange}
        onWordColorsChange={onWordColorsChange}
      />
    </div>
  )
}