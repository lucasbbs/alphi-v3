'use client'

import React from 'react'
import VerseEditor from '../VerseEditor'

interface VerseInputProps {
  verse: string
  words: any[]
  wordGroups: any[]
  onVerseChange: (verse: string) => void
  onWordsChange: (words: any[]) => void
  onWordGroupsChange: (wordGroups: any[]) => void
}

export default function VerseInput({
  verse,
  words,
  wordGroups,
  onVerseChange,
  onWordsChange,
  onWordGroupsChange
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
        onVerseChange={onVerseChange}
        onWordsChange={onWordsChange}
        onWordGroupsChange={onWordGroupsChange}
      />
    </div>
  )
}