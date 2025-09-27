"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useSession } from "@clerk/nextjs";
import { AppDispatch } from "@/lib/store";
import { createPoem, updatePoem } from "@/lib/store/gameSlice";
import { LocalPoem, PoemService } from "@/lib/supabase/services/poemService";
import { WordClassesService } from "@/lib/supabase/services/wordClassesServices";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Save, Play } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// Step Components
import WordClassSelection from "./steps/WordClassSelection";
import ImageSelection from "./steps/ImageSelection";
import VerseInput from "./steps/VerseInput";
import WordClassification from "./steps/WordClassification";
import SecretWordInput from "./steps/SecretWordInput";
import GenderSelection from "./steps/GenderSelection";

interface MultiStepGameCreatorProps {
  editingPoem?: LocalPoem | null;
  onCancel: () => void;
  onTestGame: (poem: LocalPoem) => void;
}

interface FormData {
  wordClasses: string[];
  image: string | null;
  verse: string;
  words: any[];
  wordGroups: any[];
  gameParticipatingWords: number[];
  wordColors: { [key: number]: string };
  targetWord: string;
  targetWordGender: "masculin" | "féminin";
}

const STEPS = [
  {
    id: 1,
    title: "Classes grammaticales",
    description: "Sélectionner les classes à utiliser",
  },
  { id: 2, title: "Image", description: "Choisir une image pour le poème" },
  { id: 3, title: "Vers", description: "Saisir le vers du poème" },
  {
    id: 4,
    title: "Classification",
    description: "Attribuer les classes aux mots",
  },
  { id: 5, title: "Mot mystère", description: "Définir le mot secret" },
  { id: 6, title: "Genre", description: "Choisir le genre du mot mystère" },
];

export default function MultiStepGameCreator({
  editingPoem,
  onCancel,
  onTestGame,
}: MultiStepGameCreatorProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { session } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    wordClasses: [],
    image: editingPoem?.image || null,
    verse: editingPoem?.verse || "",
    words: editingPoem?.words || [],
    wordGroups: editingPoem?.wordGroups || [],
    gameParticipatingWords: editingPoem?.gameParticipatingWords || [],
    wordColors: editingPoem?.wordColors || {},
    targetWord: editingPoem?.targetWord || "",
    targetWordGender: editingPoem?.targetWordGender || "masculin",
  });

  // Load existing word classes if editing
  useEffect(() => {
    const loadWordClasses = async () => {
      if (editingPoem && session) {
        try {
          const sessionToken = await session.getToken({ template: "supabase" });
          if (sessionToken) {
            const wordClasses = await WordClassesService.fetchWordClasses(
              sessionToken,
              editingPoem.id || "",
            );
            setFormData((prev) => ({ ...prev, wordClasses }));
          }
        } catch (error) {
          console.error("Error loading word classes:", error);
        }
      }
    };
    loadWordClasses();
  }, [editingPoem, session]);

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Define callbacks at component level to avoid hooks in JSX
  const handleVerseChange = useCallback(
    (verse: string) => updateFormData({ verse }),
    [updateFormData],
  );
  const handleWordsChange = useCallback(
    (words: any[]) => updateFormData({ words }),
    [updateFormData],
  );
  const handleWordGroupsChange = useCallback(
    (wordGroups: any[]) => updateFormData({ wordGroups }),
    [updateFormData],
  );
  const handleGameParticipatingWordsChange = useCallback(
    (gameParticipatingWords: number[]) =>
      updateFormData({ gameParticipatingWords }),
    [updateFormData],
  );
  const handleWordColorsChange = useCallback(
    (wordColors: { [key: number]: string }) => updateFormData({ wordColors }),
    [updateFormData],
  );

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.wordClasses.length > 0;
      case 2:
        return true; // Image is optional
      case 3:
        return formData.verse.trim().length > 0 && formData.words.length > 0;
      case 4:
        return formData.words.every((word) => word.class);
      case 5:
        return formData.targetWord.trim().length > 0;
      case 6:
        return (
          formData.targetWordGender === "masculin" ||
          formData.targetWordGender === "féminin"
        );
      default:
        return true;
    }
  };

  const canGoNext = () => {
    return validateStep(currentStep) && currentStep < STEPS.length;
  };

  const canGoPrevious = () => {
    return currentStep > 1;
  };

  const canCompleteForm = () => {
    // Check that all required steps are completed
    for (let step = 1; step <= STEPS.length; step++) {
      if (!validateStep(step)) {
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (canGoNext()) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Show validation error for current step
      const stepTitle = STEPS[currentStep - 1].title;
      toast.error(
        `Veuillez compléter l'étape "${stepTitle}" avant de continuer`,
      );
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious()) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!session) {
      toast.error("Vous devez être connecté pour sauvegarder");
      return;
    }

    // Validate all steps
    for (let step = 1; step <= STEPS.length; step++) {
      if (!validateStep(step)) {
        const stepTitle = STEPS[step - 1].title;
        toast.error(`Veuillez compléter l'étape "${stepTitle}"`);
        setCurrentStep(step);
        return;
      }
    }

    setIsLoading(true);

    try {
      const sessionToken = await session.getToken({ template: "supabase" });
      if (!sessionToken) {
        toast.error("Erreur d'authentification");
        return;
      }

      // Upload image to imgbb if needed
      let imageUrl = formData.image;
      if (formData.image && formData.image.startsWith("data:")) {
        toast("Upload de l'image en cours...", { icon: "📤" });

        try {
          const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: formData.image,
              expiration: 0,
            }),
          });

          const result = await response.json();

          if (result.success) {
            imageUrl = result.data.display_url;
            toast.success("Image uploadée avec succès!");
          } else {
            toast.error(`Erreur d'upload: ${result.error}`);
            imageUrl = null;
          }
        } catch (imageError) {
          console.error("Image upload error:", imageError);
          toast.error("Erreur lors de l'upload de l'image");
          imageUrl = null;
        }
      }

      const poem: LocalPoem = {
        id: editingPoem?.id || uuidv4(),
        image: imageUrl,
        verse: formData.verse,
        words: formData.words,
        wordGroups: formData.wordGroups,
        targetWord: formData.targetWord.toUpperCase(),
        targetWordGender: formData.targetWordGender,
        createdAt: editingPoem?.createdAt || new Date().toISOString(),
        gameParticipatingWords: formData.gameParticipatingWords,
        wordColors: formData.wordColors,
        wordClasses: formData.wordClasses,
      };

      let id = "";
      if (editingPoem) {
        ({ id } = await dispatch(updatePoem({ sessionToken, poem })).unwrap());
        toast.success("Jeu mis à jour avec succès!");
      } else {
        ({ id } = await dispatch(createPoem({ sessionToken, poem })).unwrap());
        toast.success("Nouveau jeu créé avec succès!");
      }

      // Save word classes
      await WordClassesService.saveWordClasses(
        sessionToken,
        poem.id || id,
        formData.wordClasses,
      );

      onCancel();
    } catch (error) {
      console.error("Error saving poem:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = () => {
    const poem: LocalPoem = {
      id: editingPoem?.id || uuidv4(),
      image: formData.image,
      verse: formData.verse,
      words: formData.words,
      wordGroups: formData.wordGroups,
      targetWord: formData.targetWord.toUpperCase(),
      targetWordGender: formData.targetWordGender,
      createdAt: editingPoem?.createdAt || new Date().toISOString(),
      gameParticipatingWords: formData.gameParticipatingWords,
      wordColors: formData.wordColors,
      wordClasses: formData.wordClasses,
    };
    onTestGame(poem);
  };

  const canTest = () => {
    return (
      formData.verse.trim() &&
      formData.words.length > 0 &&
      formData.words.every((word: any) => word.class) &&
      formData.targetWord.trim()
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WordClassSelection
            selectedClasses={formData.wordClasses}
            onClassesChange={(classes: string[]) =>
              updateFormData({ wordClasses: classes })
            }
          />
        );
      case 2:
        return (
          <ImageSelection
            currentImage={formData.image}
            onImageChange={(image: string | null) => updateFormData({ image })}
          />
        );
      case 3:
        return (
          <VerseInput
            verse={formData.verse}
            words={formData.words}
            wordGroups={formData.wordGroups}
            gameParticipatingWords={formData.gameParticipatingWords}
            wordColors={formData.wordColors}
            onVerseChange={handleVerseChange}
            onWordsChange={handleWordsChange}
            onWordGroupsChange={handleWordGroupsChange}
            onGameParticipatingWordsChange={handleGameParticipatingWordsChange}
            onWordColorsChange={handleWordColorsChange}
          />
        );
      case 4:
        return (
          <WordClassification
            words={formData.words}
            availableClasses={formData.wordClasses}
            wordColors={formData.wordColors}
            onWordsChange={(words: any[]) => updateFormData({ words })}
            onGameParticipatingWordsChange={(
              gameParticipatingWords: number[],
            ) => updateFormData({ gameParticipatingWords })}
            onWordColorsChange={(wordColors: { [key: number]: string }) =>
              updateFormData({ wordColors })
            }
          />
        );
      case 5:
        return (
          <SecretWordInput
            targetWord={formData.targetWord}
            gameParticipatingWords={formData.gameParticipatingWords}
            words={formData.words}
            wordColors={formData.wordColors}
            onTargetWordChange={(targetWord: string) =>
              updateFormData({ targetWord })
            }
          />
        );
      case 6:
        return (
          <GenderSelection
            targetWordGender={formData.targetWordGender}
            onGenderChange={(targetWordGender: "masculin" | "féminin") =>
              updateFormData({ targetWordGender })
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-lg">
      {/* Header */}
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
          {canTest() && (
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
            disabled={isLoading}
            className="flex items-center space-x-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Sauvegarde..." : "Enregistrer"}</span>
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  currentStep >= step.id
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {step.id}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.id ? "text-orange-600" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-16 ${
                    currentStep > step.id ? "bg-orange-500" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="mb-8">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious()}
          className="flex items-center space-x-2 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Précédent</span>
        </button>

        <div className="text-sm text-gray-500">
          Étape {currentStep} sur {STEPS.length}
        </div>

        {currentStep === STEPS.length ? (
          <button
            onClick={handleSave}
            disabled={isLoading || !canCompleteForm()}
            className="flex items-center space-x-2 rounded-lg bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? "Sauvegarde..." : "Terminer le jeu"}</span>
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canGoNext()}
            className="flex items-center space-x-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <span>Suivant</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
