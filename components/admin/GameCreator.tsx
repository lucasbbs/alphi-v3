"use client";

import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "@clerk/nextjs";
import { createPoem, updatePoem, type Poem } from "@/lib/store/gameSlice";
import { AppDispatch } from "@/lib/store";
import ImageDropzone from "./ImageDropzone";
import VerseEditor from "./VerseEditor";
import { Save, Play, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface GameCreatorProps {
  editingPoem?: Poem | null;
  onCancel: () => void;
  onTestGame: (poem: Poem) => void;
}

export default function GameCreator({
  editingPoem,
  onCancel,
  onTestGame,
}: GameCreatorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { session } = useSession();

  const [formData, setFormData] = useState({
    image: editingPoem?.image || null,
    verse: editingPoem?.verse || "",
    words: editingPoem?.words || [],
    wordGroups: editingPoem?.wordGroups || [],
    targetWord: editingPoem?.targetWord || "",
    targetWordGender:
      editingPoem?.targetWordGender || ("masculin" as "masculin" | "féminin"),
    gameParticipatingWords: editingPoem?.gameParticipatingWords || [],
    wordColors: editingPoem?.wordColors || {},
  });

  const handleSave = async () => {
    // Check if user is authenticated
    if (!session) {
      toast.error("Vous devez être connecté pour sauvegarder");
      return;
    }

    // Validation
    if (!formData.verse.trim()) {
      toast.error("Veuillez saisir un vers");
      return;
    }

    if (formData.words.length === 0) {
      toast.error("Veuillez analyser le vers pour extraire les mots");
      return;
    }

    if (formData.words.some((word) => !word.class)) {
      toast.error("Veuillez attribuer une classe grammaticale à tous les mots");
      return;
    }

    if (!formData.targetWord.trim()) {
      toast.error("Veuillez saisir le mot mystère pour l'étape 3");
      return;
    }

    // Mystery word specific validations
    const mysteryWordValidation = validateMysteryWord();
    if (!mysteryWordValidation.isValid) {
      toast.error(mysteryWordValidation.error);
      return;
    }

    try {
      // Get Supabase session token
      const sessionToken = await session.getToken({ template: "supabase" });
      if (!sessionToken) {
        toast.error("Erreur d'authentification");
        return;
      }

      // Upload image to imgbb if there's an image
      let imageUrl = formData.image;
      if (formData.image && formData.image.startsWith("data:")) {
        toast("Upload de l'image en cours...", { icon: "📤" });

        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: formData.image,
              expiration: 0,
            }),
          });

          const result = await response.json();

          if (result.success) {
            imageUrl = result.data.display_url; // Use display_url as requested
            toast.success("Image uploadée avec succès!");
          } else {
            toast.error(`Erreur d'upload: ${result.error}`);
            // Continue saving without image
            imageUrl = null;
          }
        } catch (imageError) {
          console.error("Image upload error:", imageError);
          toast.error("Erreur lors de l'upload de l'image");
          // Continue saving without image
          imageUrl = null;
        }
      }

      const poem: Poem = {
        id: editingPoem?.id || `poem-${Date.now()}`,
        image: imageUrl,
        verse: formData.verse,
        words: formData.words,
        wordGroups: formData.wordGroups,
        targetWord: formData.targetWord.toUpperCase(),
        targetWordGender: formData.targetWordGender,
        createdAt: editingPoem?.createdAt || new Date().toISOString(),
        gameParticipatingWords: formData.gameParticipatingWords,
        wordColors: formData.wordColors,
      };

      if (editingPoem) {
        await dispatch(updatePoem({ sessionToken, poem })).unwrap();
        toast.success("Jeu mis à jour avec succès!");
      } else {
        await dispatch(createPoem({ sessionToken, poem })).unwrap();
        toast.success("Nouveau jeu créé avec succès!");
      }

      // Optionally close the form
      onCancel();
    } catch (error) {
      console.error("Error saving poem:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleTest = () => {
    const poem: Poem = {
      id: editingPoem?.id || `poem-${Date.now()}`,
      image: formData.image,
      verse: formData.verse,
      words: formData.words,
      wordGroups: formData.wordGroups,
      targetWord: formData.targetWord.toUpperCase(),
      targetWordGender: formData.targetWordGender,
      createdAt: editingPoem?.createdAt || new Date().toISOString(),
      gameParticipatingWords: formData.gameParticipatingWords,
      wordColors: formData.wordColors,
    };
    onTestGame(poem);
  };

  // Get participating units (words or groups) with their colors for mystery word preview
  const getParticipatingWordsWithColors = () => {
    const processedIndices = new Set<number>();
    const participatingUnits: Array<{
      word: string;
      color: string;
      index: number;
      isGroup: boolean;
    }> = [];

    formData.gameParticipatingWords.forEach((wordIndex) => {
      if (processedIndices.has(wordIndex)) return;

      const word = formData.words[wordIndex];
      if (!word) return;

      // Check if this word is part of a group
      const group = word.groupId
        ? formData.wordGroups?.find((g) => g.id === word.groupId)
        : null;

      if (group) {
        // Find all participating words in this group
        const groupParticipatingWords = group.wordIndices.filter((idx) =>
          formData.gameParticipatingWords.includes(idx),
        );

        if (groupParticipatingWords.length > 0) {
          // Sort by original indices to maintain word order within group
          groupParticipatingWords.sort((a, b) => a - b);

          // Get group words text and use first word's color (groups should have consistent colors)
          const groupWords = groupParticipatingWords
            .map((idx) => formData.words[idx]?.word || "")
            .join(" ");
          const groupColor =
            formData.wordColors[groupParticipatingWords[0]] || "#D1D5DB";

          participatingUnits.push({
            word: groupWords,
            color: groupColor,
            index: wordIndex, // Use first word's index for reference
            isGroup: true,
          });

          // Mark all group members as processed
          groupParticipatingWords.forEach((idx) => processedIndices.add(idx));
        }
      } else {
        // Individual word
        participatingUnits.push({
          word: word.word,
          color: formData.wordColors[wordIndex] || "#D1D5DB",
          index: wordIndex,
          isGroup: false,
        });
        processedIndices.add(wordIndex);
      }
    });

    return participatingUnits;
  };

  // Validate mystery word against participating units
  const validateMysteryWord = () => {
    const participatingUnits = getParticipatingWordsWithColors();
    const mysteryLetters = formData.targetWord.toUpperCase().split("");

    // Validation 1: Number of letters should match number of participating units (words/groups)
    if (mysteryLetters.length !== participatingUnits.length) {
      const unitDescription =
        participatingUnits.length === 1
          ? "unité sélectionnée"
          : "unités sélectionnées";
      return {
        isValid: false,
        error: `Le mot mystère doit avoir ${participatingUnits.length} lettre${
          mysteryLetters.length > 1 ? "s" : ""
        } pour correspondre aux ${
          participatingUnits.length
        } ${unitDescription}`,
      };
    }

    // Validation 2: Same letters should have same colors
    const letterColorMap = new Map<string, string>();
    for (let i = 0; i < mysteryLetters.length; i++) {
      const letter = mysteryLetters[i];
      const color = participatingUnits[i].color;

      if (letterColorMap.has(letter)) {
        if (letterColorMap.get(letter) !== color) {
          return {
            isValid: false,
            error: `La lettre "${letter}" apparaît plusieurs fois mais avec des couleurs différentes. Assurez-vous que tous les mots/groupes correspondant à la même lettre aient la même couleur.`,
          };
        }
      } else {
        letterColorMap.set(letter, color);
      }
    }

    return { isValid: true, error: "" };
  };

  // Get mystery word preview with colors
  const getMysteryWordPreview = () => {
    const participatingUnits = getParticipatingWordsWithColors();
    const mysteryLetters = formData.targetWord.toUpperCase().split("");

    return mysteryLetters.map((letter, index) => ({
      letter,
      color: participatingUnits[index]?.color || "#D1D5DB",
      word: participatingUnits[index]?.word || "",
      isValid: index < participatingUnits.length,
      isGroup: participatingUnits[index]?.isGroup || false,
    }));
  };

  const canTest =
    formData.verse.trim() &&
    formData.words.length > 0 &&
    formData.words.every((word) => word.class) &&
    formData.targetWord.trim();

  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
            {editingPoem ? "Modifier le jeu" : "Créer un nouveau jeu"}
          </h2>
        </div>
        <div className="flex space-x-3">
          {canTest && (
            <button
              onClick={handleTest}
              className="flex items-center space-x-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
            >
              <Play className="h-4 w-4" />
              <span>Tester</span>
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Save className="h-4 w-4" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Image Dropzone */}
        <ImageDropzone
          currentImage={formData.image}
          onImageSelect={(imageUrl) =>
            setFormData((prev) => ({ ...prev, image: imageUrl }))
          }
        />

        {/* 2. Verse Editor */}
        <VerseEditor
          verse={formData.verse}
          words={formData.words}
          wordGroups={formData.wordGroups}
          gameParticipatingWords={formData.gameParticipatingWords}
          wordColors={formData.wordColors}
          onVerseChange={(verse) => setFormData((prev) => ({ ...prev, verse }))}
          onWordsChange={(words) => setFormData((prev) => ({ ...prev, words }))}
          onWordGroupsChange={(wordGroups) =>
            setFormData((prev) => ({ ...prev, wordGroups }))
          }
          onGameParticipatingWordsChange={(gameParticipatingWords) =>
            setFormData((prev) => ({ ...prev, gameParticipatingWords }))
          }
          onWordColorsChange={(wordColors) =>
            setFormData((prev) => ({ ...prev, wordColors }))
          }
        />

        {/* 3. Target Word Input */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mot mystère pour l'étape 3
          </label>
          <input
            type="text"
            value={formData.targetWord}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, targetWord: e.target.value }))
            }
            placeholder="Ex: HORAIRE"
            className="w-full rounded-md border border-gray-300 px-3 py-2 uppercase focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Ce mot sera formé en glissant-déposant les lettres colorées
          </p>

          {/* Mystery Word Preview */}
          {formData.targetWord.trim() &&
            formData.gameParticipatingWords.length > 0 && (
              <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                <h4 className="mb-3 text-sm font-medium text-gray-700">
                  Aperçu du mot mystère :
                </h4>

                {/* Letter preview */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {getMysteryWordPreview().map((letterInfo, index) => (
                    <div key={index} className="text-center">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg border-2 text-lg font-bold text-white"
                        style={{
                          backgroundColor: letterInfo.isValid
                            ? letterInfo.color
                            : "#E5E7EB",
                          borderColor: letterInfo.isValid
                            ? letterInfo.color
                            : "#D1D5DB",
                        }}
                      >
                        {letterInfo.letter}
                      </div>
                      <div
                        className="max-w-16 mt-1 truncate text-xs text-gray-600"
                        title={letterInfo.word}
                      >
                        {letterInfo.isValid ? (
                          <span>
                            {letterInfo.word}
                            {letterInfo.isGroup && (
                              <span className="ml-1">👥</span>
                            )}
                          </span>
                        ) : (
                          "?"
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation status */}
                {(() => {
                  const validation = validateMysteryWord();
                  return (
                    <div
                      className={`rounded p-2 text-sm ${
                        validation.isValid
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {validation.isValid ? (
                        <span className="flex items-center">
                          ✅ Configuration valide
                        </span>
                      ) : (
                        <span className="flex items-center">
                          ❌ {validation.error}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Word mapping display */}
                {formData.targetWord.trim() &&
                  formData.gameParticipatingWords.length > 0 && (
                    <div className="mt-3 text-xs text-gray-600">
                      <p className="mb-1 font-medium">Correspondance :</p>
                      <div className="space-y-1">
                        {getMysteryWordPreview().map((letterInfo, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <span
                              className="inline-block flex h-6 w-6 items-center justify-center rounded text-center text-xs font-bold text-white"
                              style={{ backgroundColor: letterInfo.color }}
                            >
                              {letterInfo.letter}
                            </span>
                            <span>→</span>
                            <span className="flex items-center space-x-1">
                              <span>
                                {letterInfo.isValid
                                  ? letterInfo.word
                                  : "Unité manquante"}
                              </span>
                              {letterInfo.isGroup && <span>👥</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
        </div>

        {/* 4. Gender Selection */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            Genre du mot mystère
          </label>
          <div className="flex space-x-6">
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="masculin"
                checked={formData.targetWordGender === "masculin"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetWordGender: e.target.value as "masculin" | "féminin",
                  }))
                }
                className="mr-2 text-blue-500 focus:ring-blue-500"
              />
              <span className="font-medium text-blue-700">
                🔵 Masculin (Un {formData.targetWord.toLowerCase()})
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="féminin"
                checked={formData.targetWordGender === "féminin"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetWordGender: e.target.value as "masculin" | "féminin",
                  }))
                }
                className="mr-2 text-pink-500 focus:ring-pink-500"
              />
              <span className="font-medium text-pink-700">
                🔴 Féminin (Une {formData.targetWord.toLowerCase()})
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
