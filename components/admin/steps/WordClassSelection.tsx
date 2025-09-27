'use client'

import React, { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'

interface WordClassSelectionProps {
  selectedClasses: string[]
  onClassesChange: (classes: string[]) => void
}

const PREDEFINED_CLASSES = [
  'nom',
  'adjectif',
  'verbe',
  'adverbe',
  'pronom',
  'déterminant',
  'préposition',
  'conjonction',
  'interjection',
  'article'
]

export default function WordClassSelection({
  selectedClasses,
  onClassesChange
}: WordClassSelectionProps) {
  const [customClass, setCustomClass] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleToggleClass = (className: string) => {
    if (selectedClasses.includes(className)) {
      onClassesChange(selectedClasses.filter(c => c !== className))
    } else {
      onClassesChange([...selectedClasses, className])
    }
  }

  const handleAddCustomClass = () => {
    if (customClass.trim() && !selectedClasses.includes(customClass.trim())) {
      onClassesChange([...selectedClasses, customClass.trim()])
      setCustomClass('')
      setShowCustomInput(false)
    }
  }

  const handleRemoveClass = (className: string) => {
    onClassesChange(selectedClasses.filter(c => c !== className))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Sélectionner les classes grammaticales
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Choisissez les classes grammaticales que vous souhaitez utiliser dans ce jeu. 
          Vous pourrez ensuite attribuer ces classes aux mots du poème.
        </p>
      </div>

      {/* Predefined Classes */}
      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">Classes prédéfinies</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PREDEFINED_CLASSES.map((className) => (
            <button
              key={className}
              onClick={() => handleToggleClass(className)}
              className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all ${
                selectedClasses.includes(className)
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
              }`}
            >
              <span className="capitalize font-medium">{className}</span>
              {selectedClasses.includes(className) && (
                <Check className="ml-2 h-4 w-4" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Class Input */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-700">Classe personnalisée</h4>
          {!showCustomInput && (
            <button
              onClick={() => setShowCustomInput(true)}
              className="flex items-center space-x-1 text-orange-600 hover:text-orange-700"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </button>
          )}
        </div>

        {showCustomInput && (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customClass}
              onChange={(e) => setCustomClass(e.target.value)}
              placeholder="Nom de la classe grammaticale"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomClass()
                } else if (e.key === 'Escape') {
                  setCustomClass('')
                  setShowCustomInput(false)
                }
              }}
              autoFocus
            />
            <button
              onClick={handleAddCustomClass}
              disabled={!customClass.trim()}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setCustomClass('')
                setShowCustomInput(false)
              }}
              className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Selected Classes Summary */}
      {selectedClasses.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">
            Classes sélectionnées ({selectedClasses.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedClasses.map((className) => (
              <div
                key={className}
                className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm"
              >
                <span className="capitalize font-medium">{className}</span>
                <button
                  onClick={() => handleRemoveClass(className)}
                  className="hover:bg-orange-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedClasses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune classe grammaticale sélectionnée</p>
          <p className="text-sm">Sélectionnez au moins une classe pour continuer</p>
        </div>
      )}
    </div>
  )
}