'use client'

import React, { useState } from 'react'
import ColorPicker from '../ColorPicker'
import Popover from '@/components/shared/popover'

interface WordClassificationProps {
  words: any[]
  availableClasses: string[]
  wordColors?: {[key: number]: string}
  onWordsChange: (words: any[]) => void
  onGameParticipatingWordsChange: (gameParticipatingWords: number[]) => void
  onWordColorsChange: (wordColors: {[key: number]: string}) => void
}

export default function WordClassification({
  words,
  availableClasses,
  wordColors = {},
  onWordsChange,
  onGameParticipatingWordsChange,
  onWordColorsChange
}: WordClassificationProps) {
  const [openPopovers, setOpenPopovers] = useState<{ [key: number]: boolean }>({})

  const togglePopover = (index: number, open: boolean) => {
    setOpenPopovers((prev) => ({ ...prev, [index]: open }))
  }
  const handleWordClassChange = (wordIndex: number, newClass: string) => {
    const updatedWords = words.map((word, index) => 
      index === wordIndex ? { ...word, class: newClass } : word
    )
    onWordsChange(updatedWords)
  }

  const handleWordSelectionChange = (wordIndex: number, isSelected: boolean) => {
    const updatedWords = words.map((word, index) => 
      index === wordIndex ? { ...word, isSelected } : word
    )
    onWordsChange(updatedWords)

    // Update participating words for the game
    const participatingWords = updatedWords
      .map((word, index) => word.isSelected ? index : -1)
      .filter(index => index !== -1)
    onGameParticipatingWordsChange(participatingWords)

    // Only assign colors to newly selected words (preserve existing custom colors)
    const colors: {[key: number]: string} = { ...wordColors }
    const colorPalette = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']
    
    participatingWords.forEach((wordIndex, colorIndex) => {
      // Only assign automatic color if word doesn't already have a custom color
      if (!colors[wordIndex]) {
        colors[wordIndex] = colorPalette[colorIndex % colorPalette.length]
      }
    })

    // Remove colors for words that are no longer participating
    Object.keys(colors).forEach(key => {
      const index = parseInt(key)
      if (!participatingWords.includes(index)) {
        delete colors[index]
      }
    })

    onWordColorsChange(colors)
  }

  const handleWordColorChange = (index: number, color: string) => {
    const newWordColors = { ...wordColors, [index]: color }
    onWordColorsChange(newWordColors)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Classification grammaticale des mots
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Attribuez une classe grammaticale à chaque mot et sélectionnez ceux qui participeront au jeu.
        </p>
      </div>

      {words.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Aucun mot à classifier</p>
          <p className="text-sm">Veuillez d'abord saisir et analyser un vers</p>
        </div>
      ) : (
        <div className="space-y-4">
          {words.map((word, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={word.isSelected || false}
                  onChange={(e) => handleWordSelectionChange(index, e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="font-medium text-gray-800 min-w-[100px]">
                  {word.word}
                </span>
              </div>
              
              <div className="flex-1">
                <select
                  value={word.class || ''}
                  onChange={(e) => handleWordClassChange(index, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Sélectionner une classe</option>
                  {availableClasses.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>

              {word.isSelected && (
                <Popover
                  openPopover={openPopovers[index] || false}
                  setOpenPopover={(open) => {
                    if (typeof open === "boolean") {
                      togglePopover(index, open);
                    } else {
                      // Handle function case
                      togglePopover(
                        index,
                        open(openPopovers[index] || false),
                      );
                    }
                  }}
                  content={
                    <div className="w-80 space-y-3 p-4">
                      <h5 className="text-sm font-medium text-gray-700">
                        Couleur pour "{word.word}"
                      </h5>
                      <ColorPicker
                        selectedColor={wordColors[index] || "#D1D5DB"}
                        onColorChange={(color) => {
                          handleWordColorChange(index, color);
                          togglePopover(index, false);
                        }}
                      />
                    </div>
                  }
                >
                  <button
                    type="button"
                    className="h-6 w-6 rounded border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: wordColors[index] || "#D1D5DB",
                    }}
                    title="Choisir la couleur"
                  />
                </Popover>
              )}
            </div>
          ))}
        </div>
      )}

      {availableClasses.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Aucune classe grammaticale disponible. Veuillez retourner à l'étape 1 pour sélectionner des classes.
          </p>
        </div>
      )}
    </div>
  )
}