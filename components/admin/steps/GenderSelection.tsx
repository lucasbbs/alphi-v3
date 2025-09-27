'use client'

import React from 'react'

interface GenderSelectionProps {
  targetWordGender: 'masculin' | 'féminin'
  onGenderChange: (gender: 'masculin' | 'féminin') => void
}

export default function GenderSelection({
  targetWordGender,
  onGenderChange
}: GenderSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Genre du mot mystère
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez le genre grammatical du mot mystère.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Genre du mot mystère
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onGenderChange('masculin')}
            className={`p-4 rounded-lg border-2 transition-all text-center ${
              targetWordGender === 'masculin'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
            }`}
          >
            <div className="text-lg font-semibold">Masculin</div>
            <div className="text-sm text-gray-500">Le mot mystère</div>
          </button>
          
          <button
            onClick={() => onGenderChange('féminin')}
            className={`p-4 rounded-lg border-2 transition-all text-center ${
              targetWordGender === 'féminin'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
            }`}
          >
            <div className="text-lg font-semibold">Féminin</div>
            <div className="text-sm text-gray-500">La mot mystère</div>
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-500 mt-0.5">ℹ️</div>
          <div>
            <p className="text-blue-800 text-sm font-medium">Information</p>
            <p className="text-blue-700 text-sm">
              Le genre sélectionné sera utilisé pour l'affichage de l'article défini avec le mot mystère dans le jeu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}