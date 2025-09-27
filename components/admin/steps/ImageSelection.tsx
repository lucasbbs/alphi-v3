'use client'

import React from 'react'
import ImageDropzone from '../ImageDropzone'

interface ImageSelectionProps {
  currentImage: string | null
  onImageChange: (image: string | null) => void
}

export default function ImageSelection({
  currentImage,
  onImageChange
}: ImageSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Image du poème
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez une image qui accompagnera votre poème. Cette étape est optionnelle.
        </p>
      </div>

      <ImageDropzone
        currentImage={currentImage}
        onImageSelect={onImageChange}
      />
    </div>
  )
}