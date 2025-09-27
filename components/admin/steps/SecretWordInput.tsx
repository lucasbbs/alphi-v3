'use client'

import React from 'react'

interface SecretWordInputProps {
  targetWord: string
  gameParticipatingWords: number[]
  words: any[]
  wordColors: {[key: number]: string}
  onTargetWordChange: (targetWord: string) => void
}

export default function SecretWordInput({
  targetWord,
  gameParticipatingWords,
  words,
  wordColors,
  onTargetWordChange
}: SecretWordInputProps) {
  // Get participating units (words or groups) with their colors for mystery word preview
  const getParticipatingWordsWithColors = () => {
    const participatingUnits: Array<{
      word: string
      color: string
      index: number
      isGroup: boolean
    }> = []

    gameParticipatingWords.forEach((wordIndex) => {
      const word = words[wordIndex]
      if (!word) return

      participatingUnits.push({
        word: word.word,
        color: wordColors[wordIndex] || '#D1D5DB',
        index: wordIndex,
        isGroup: false
      })
    })

    return participatingUnits
  }

  // Validate mystery word
  const validateMysteryWord = () => {
    const participatingUnits = getParticipatingWordsWithColors()
    const mysteryLetters = targetWord.toUpperCase().split('')

    if (mysteryLetters.length !== participatingUnits.length) {
      const unitDescription = participatingUnits.length === 1 ? "unité sélectionnée" : "unités sélectionnées"
      return {
        isValid: false,
        error: `Le mot mystère doit avoir ${participatingUnits.length} lettre${
          participatingUnits.length > 1 ? "s" : ""
        } pour correspondre aux ${participatingUnits.length} ${unitDescription}`
      }
    }

    // Validation: Same letters should have same colors
    const letterColorMap = new Map<string, string>()
    for (let i = 0; i < mysteryLetters.length; i++) {
      const letter = mysteryLetters[i]
      const color = participatingUnits[i].color

      if (letterColorMap.has(letter)) {
        if (letterColorMap.get(letter) !== color) {
          return {
            isValid: false,
            error: `La lettre "${letter}" apparaît plusieurs fois mais avec des couleurs différentes. Assurez-vous que tous les mots/groupes correspondant à la même lettre aient la même couleur.`
          }
        }
      } else {
        letterColorMap.set(letter, color)
      }
    }

    return { isValid: true, error: "" }
  }

  // Get mystery word preview with colors
  const getMysteryWordPreview = () => {
    const participatingUnits = getParticipatingWordsWithColors()
    const mysteryLetters = targetWord.toUpperCase().split("")

    return mysteryLetters.map((letter, index) => ({
      letter,
      color: participatingUnits[index]?.color || "#D1D5DB",
      word: participatingUnits[index]?.word || "",
      isValid: index < participatingUnits.length,
      isGroup: participatingUnits[index]?.isGroup || false,
    }))
  }

  const mysteryWordValidation = validateMysteryWord()
  const mysteryWordPreview = getMysteryWordPreview()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Mot mystère pour l'étape 3
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Définissez le mot mystère que les joueurs devront deviner lors de l'étape 3 du jeu.
        </p>
      </div>

      {gameParticipatingWords.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Aucun mot sélectionné pour participer au jeu. Veuillez retourner à l'étape 4 pour sélectionner des mots.
          </p>
        </div>
      )}

      {gameParticipatingWords.length > 0 && (
        <>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Mot mystère (doit contenir {gameParticipatingWords.length} lettre{gameParticipatingWords.length > 1 ? 's' : ''})
            </label>
            <input
              type="text"
              value={targetWord}
              onChange={(e) => onTargetWordChange(e.target.value)}
              placeholder="Saisissez le mot mystère"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              maxLength={20}
            />
          </div>

          {/* Validation Message */}
          {targetWord && !mysteryWordValidation.isValid && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{mysteryWordValidation.error}</p>
            </div>
          )}

          {/* Mystery Word Preview */}
          {targetWord && mysteryWordValidation.isValid && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Aperçu du mot mystère</h4>
              <div className="flex items-center space-x-2">
                {mysteryWordPreview.map((letterInfo, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-1"
                  >
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center text-lg font-bold text-white"
                      style={{ backgroundColor: letterInfo.color }}
                    >
                      {letterInfo.letter}
                    </div>
                    <div className="text-xs text-gray-600 text-center max-w-[80px] truncate">
                      {letterInfo.word}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participating Words List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">
              Mots participants ({gameParticipatingWords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {getParticipatingWordsWithColors().map((unit, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: unit.color }}
                >
                  <span>{unit.word}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}