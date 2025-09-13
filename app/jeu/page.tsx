"use client";

import { useState, useEffect } from "react";
import { useUser, useSession } from "@clerk/nextjs";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/lib/store";
import { fetchPoems } from "@/lib/store/gameSlice";
import { ProgressService } from "@/lib/supabase/services/progressService";
import toast from "react-hot-toast";
import { Clock } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Types pour le jeu
interface WordClass {
  name: string;
  color: string;
  letter: string;
}

interface GameWord {
  word: string;
  class: string;
  isSelected: boolean;
  groupId?: string;
}

interface WordGroup {
  id: string;
  name: string;
  color: string;
  wordIndices: number[];
}

interface Poem {
  id: string | number;
  image: string | null;
  verse: string;
  words: GameWord[];
  wordGroups: WordGroup[];
  targetWord?: string;
  targetWordGender?: "masculin" | "féminin";
  gameParticipatingWords?: number[];
  wordColors?: { [key: number]: string };
}

interface DroppedLetter {
  letter: string;
  color: string;
  id: string;
  customStyle?: { backgroundColor: string };
}

// Classes de mots avec leurs couleurs et lettres selon le tableau fourni
const wordClasses: WordClass[] = [
  { name: "adverbe", color: "bg-orange-400", letter: "H" }, // Demain → Orange → H
  { name: "déterminant défini", color: "bg-pink-400", letter: "O" }, // L' → Pink → O
  { name: "verbe", color: "bg-green-400", letter: "R" }, // Viendra → Green → R
  { name: "déterminant possessif", color: "bg-yellow-400", letter: "A" }, // Sa → Yellow → A
  { name: "adjectif", color: "bg-red-400", letter: "I" }, // Froide → Red → I
  { name: "préposition", color: "bg-green-400", letter: "R" }, // Sur → Green → R
  { name: "nom commun", color: "bg-blue-400", letter: "E" }, // Rêves → Blue → E
  { name: "pronom", color: "bg-purple-400", letter: "X" }, // X → Purple → X
  { name: "conjonction", color: "bg-indigo-400", letter: "X" }, // X → Indigo → X
  { name: "interjection", color: "bg-cyan-400", letter: "X" }, // X → Cyan → X
];

// Données par défaut (maintenues pour compatibilité)
const defaultPoems: Poem[] = [
  {
    id: "default-1",
    image: "/logo.png",
    verse: "Demain, l'hiver viendra poser sa main froide sur nos rêves.",
    words: [
      { word: "Demain", class: "adverbe", isSelected: false }, // H
      { word: "l'", class: "déterminant défini", isSelected: false }, // O
      {
        word: "viendra",
        class: "verbe",
        isSelected: false,
        groupId: "verbe-groupe-1",
      }, // R
      {
        word: "poser",
        class: "verbe",
        isSelected: false,
        groupId: "verbe-groupe-1",
      },
      { word: "sa", class: "déterminant possessif", isSelected: false }, // A
      { word: "froide", class: "adjectif", isSelected: false }, // I
      { word: "sur", class: "préposition", isSelected: false }, // R
      { word: "rêves", class: "nom commun", isSelected: false }, // E
    ],
    wordGroups: [
      {
        id: "verbe-groupe-1",
        name: "Groupe verbal",
        color: "#10B981",
        wordIndices: [2, 3],
      },
    ],
    targetWord: "HORAIRE",
    targetWordGender: "masculin",
  },
];

export default function JeuPage() {
  const { user } = useUser();
  const { session } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const { poems, loading } = useSelector((state: RootState) => state.game);

  // État du jeu
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [gameWords, setGameWords] = useState<GameWord[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<GameWord[]>([]);
  const [foundWord, setFoundWord] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [lives, setLives] = useState(3);
  const [droppedLetters, setDroppedLetters] = useState<DroppedLetter[]>([]);
  const [availableLetters, setAvailableLetters] = useState<DroppedLetter[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [gameScore, setGameScore] = useState<number>(0);
  const [availablePoems, setAvailablePoems] = useState<Poem[]>([]);

  // Fetch poems from Supabase on component mount
  useEffect(() => {
    const loadPoems = async () => {
      if (session && user) {
        try {
          const sessionToken = await session.getToken({ template: "supabase" });
          if (sessionToken) {
            dispatch(fetchPoems(sessionToken));
          }
        } catch (error) {
          console.error("Error fetching poems:", error);
          toast.error("Erreur lors du chargement des poèmes");
        }
      }
    };

    loadPoems();
  }, [session, user, dispatch]);

  // Charger les poèmes disponibles depuis Redux ou paramètres de test
  useEffect(() => {
    const testParam = searchParams.get("test");
    if (testParam === "true") {
      try {
        const testPoemData = localStorage.getItem("alphi-test-poem");
        if (testPoemData) {
          const testPoem = JSON.parse(testPoemData);
          setAvailablePoems([testPoem]);
          // Nettoyer le localStorage après utilisation
          localStorage.removeItem("alphi-test-poem");
        } else {
          console.warn("Aucun poème de test trouvé dans localStorage");
          setAvailablePoems(poems.length > 0 ? poems : defaultPoems);
        }
      } catch (error) {
        console.error("Erreur lors du parsing du poème de test:", error);
        setAvailablePoems(poems.length > 0 ? poems : defaultPoems);
      }
    } else {
      setAvailablePoems(poems.length > 0 ? poems : defaultPoems);
    }
  }, [poems, searchParams]);

  const handlePoemSelection = (poem: Poem) => {
    setSelectedPoem(poem);

    // Only include words that are marked as participating in the game
    const participatingWords = poem.gameParticipatingWords || [];
    const gameWords = poem.words
      .map((word, index) =>
        participatingWords.includes(index) ? { ...word, class: "" } : null,
      )
      .filter((word): word is GameWord => word !== null);

    setGameWords(gameWords);

    // Create aligned correct answers for the filtered game words
    const alignedCorrectAnswers = poem.words.filter((_, index) =>
      participatingWords.includes(index),
    );
    setCorrectAnswers(alignedCorrectAnswers);

    setCurrentStep(2);

    // Démarrer le timer si ce n'est pas déjà fait
    if (startTime === 0) {
      setStartTime(Date.now());
    }
  };

  const getWordColorAndLetter = (word: GameWord, wordIndex: number) => {
    if (!selectedPoem) return null;

    // Find the original word index in the poem to get admin-defined color
    const participatingWords = selectedPoem.gameParticipatingWords || [];
    const originalWordIndex = participatingWords[wordIndex];
    const adminColor = selectedPoem.wordColors?.[originalWordIndex];

    // Get the word class for letter mapping
    const wordClass = wordClasses.find((wc) => wc.name === word.class);
    const letter = wordClass ? wordClass.letter : "X";

    // Priority 1: Admin-defined color (highest priority)
    if (adminColor) {
      return {
        color: adminColor,
        letter: letter,
      };
    }

    // Priority 2: Group color (if word is part of a group)
    if (word.groupId) {
      const group = selectedPoem.wordGroups?.find((g) => g.id === word.groupId);
      if (group) {
        return {
          color: group.color,
          letter: letter,
        };
      }
    }

    // Priority 3: Default class-based color (fallback)
    return wordClass
      ? {
          color: wordClass.color,
          letter: wordClass.letter,
        }
      : { color: "bg-gray-300", letter: "X" };
  };

  const proceedToStep3 = () => {
    if (!selectedPoem) return;

    // Create a mapping of letters to colors based on the target word
    const letterColorMap = new Map<string, string>();
    const targetWord = selectedPoem.targetWord || "";

    // Highlight each letter in the target word
    targetWord.split("").forEach((letter, index) => {
      // Use a bright green color to highlight target word letters
      letterColorMap.set(
        letter.toUpperCase(),
        (selectedPoem.wordColors &&
          Object.values(selectedPoem.wordColors)[index]) ||
          "",
      );
    });
    // Generate alphabet with the correct colors
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const coloredAlphabet: DroppedLetter[] = alphabet.map((letter) => {
      const color = letterColorMap.get(letter) || "bg-gray-300";
      return {
        letter,
        color: color.startsWith("#") ? "" : color, // Use CSS class for non-hex colors
        id: `letter-${letter}-${Math.random()}`,
        customStyle: color.startsWith("#")
          ? { backgroundColor: color }
          : undefined,
      };
    });
    setAvailableLetters(coloredAlphabet);
    setDroppedLetters([]);
    setCurrentStep(3);
  };

  const loseLife = () => {
    if (gameOver) return; // Ne pas perdre de vie si le jeu est déjà terminé
    const newLives = Math.max(0, lives - 1); // Empêcher les vies négatives
    setLives(newLives);

    // Notification toast pour perte de vie
    toast.error(`❤️ Vie perdue ! ${newLives} vies restantes`, {
      icon: "💔",
      duration: 2000,
    });

    if (newLives <= 0) {
      setGameOver(true);
      toast.error("💀 Jeu terminé ! Plus de vies restantes", {
        duration: 4000,
      });
    }
  };

  const handleWordClassAssignmentWithLives = (
    wordIndex: number,
    className: string,
  ) => {
    const updatedWords = [...gameWords];
    const previousClass = updatedWords[wordIndex].class;
    const gameWord = updatedWords[wordIndex];

    // Check if this word is part of a group
    const group = gameWord.groupId
      ? selectedPoem?.wordGroups?.find((g) => g.id === gameWord.groupId)
      : null;

    if (group) {
      // Update class for all words in the group that are in gameWords
      group.wordIndices.forEach((originalIndex) => {
        const participatingWords = selectedPoem?.gameParticipatingWords || [];
        const gameWordIndex = participatingWords.findIndex(
          (pIndex) => pIndex === originalIndex,
        );
        if (gameWordIndex >= 0 && gameWordIndex < updatedWords.length) {
          updatedWords[gameWordIndex].class = className;
        }
      });
    } else {
      // Individual word
      updatedWords[wordIndex].class = className;
    }

    setGameWords(updatedWords);

    // Vérifier si c'est la bonne réponse
    const correctWord = correctAnswers[wordIndex];
    if (
      className !== "" &&
      className !== correctWord.class &&
      previousClass === ""
    ) {
      loseLife();
    }
  };

  const handleLetterDrop = (letter: DroppedLetter) => {
    const targetWord = selectedPoem?.targetWord || "HORAIRE";
    const maxLetters = targetWord.length;

    if (droppedLetters.length < maxLetters) {
      // Créer une nouvelle instance de la lettre pour permettre la réutilisation
      const newLetter: DroppedLetter = {
        ...letter,
        id: `dropped-${letter.letter}-${Date.now()}-${Math.random()}`,
      };
      setDroppedLetters([...droppedLetters, newLetter]);
      // Ne pas retirer la lettre de availableLetters pour permettre la réutilisation
    }
  };

  const handleLetterRemove = (letterId: string) => {
    // Simplement retirer la lettre des lettres déposées
    // Les lettres restent disponibles dans l'alphabet
    setDroppedLetters(droppedLetters.filter((l) => l.id !== letterId));
  };

  const checkWordInStep3 = () => {
    const formedWord = droppedLetters.map((l) => l.letter).join("");
    const targetWord = selectedPoem?.targetWord || "HORAIRE";

    if (formedWord === targetWord) {
      setFoundWord(formedWord);
      setCurrentStep(4);
    } else {
      // Perdre une vie seulement quand l'utilisateur clique sur "Vérifier le mot !"
      loseLife();
      // Réinitialiser seulement les lettres déposées
      setDroppedLetters([]);
    }
  };

  const handleGenderSelection = (gender: string) => {
    if (gameOver || selectedGender) return; // Empêcher multiples sélections
    setSelectedGender(gender);

    const correctGender = selectedPoem?.targetWordGender || "masculin";

    if (gender !== correctGender) {
      loseLife();
    } else {
      // Jeu terminé avec succès - calculer et enregistrer le score
      const finalScore = calculateScore();
      setGameScore(finalScore);
      setGameOver(true); // Arrêter le timer
      toast.success(`🎉 Félicitations ! Score: ${finalScore} points`, {
        duration: 4000,
      });

      // Sauvegarder le progrès dans Supabase
      saveGameProgress(finalScore);
    }
  };

  // Timer useEffect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime > 0 && !gameOver) {
      interval = setInterval(() => {
        setSessionTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime, gameOver]);

  // Calcul du score basé sur vies restantes et temps
  const calculateScore = () => {
    if (sessionTime === 0) return 0;

    const baseScore = 1000;
    const livesBonus = lives * 200; // Bonus pour vies restantes
    const timeBonus = Math.max(0, 300 - sessionTime); // Bonus pour rapidité (max 5 min)

    return baseScore + livesBonus + timeBonus;
  };

  const saveGameProgress = async (finalScore: number) => {
    if (!session || !selectedPoem) return;

    try {
      const sessionToken = await session.getToken({ template: "supabase" });
      if (!sessionToken) {
        console.error("No session token available");
        return;
      }

      const userId = user?.id || "";

      await ProgressService.saveGameProgress(
        sessionToken,
        selectedPoem.id.toString(),
        sessionTime,
        finalScore,
        userId,
      );

      console.log("Game progress saved successfully");
    } catch (error) {
      console.error("Failed to save game progress:", error);
      // Fallback to localStorage if Supabase fails
      const gameData = {
        date: new Date().toISOString(),
        score: finalScore,
        lives: lives,
        time: sessionTime,
        verse: selectedPoem?.verse || "",
      };

      const savedGames = JSON.parse(
        localStorage.getItem("alphi-games") || "[]",
      );
      savedGames.push(gameData);
      localStorage.setItem("alphi-games", JSON.stringify(savedGames));
    }
  };

  const resetGame = () => {
    setCurrentStep(1);
    setSelectedPoem(null);
    setGameWords([]);
    setCorrectAnswers([]);
    setFoundWord("");
    setSelectedGender("");
    setLives(3);
    setDroppedLetters([]);
    setAvailableLetters([]);
    setGameOver(false);
    setStartTime(0);
    setSessionTime(0);
    setGameScore(0);
  };

  const startNewGame = () => {
    resetGame();
    setStartTime(Date.now());
    toast.success("🎮 Nouveau jeu commencé !", {
      duration: 2000,
    });
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Connectez-vous pour jouer !
          </h1>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder au jeu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100 p-4">
      <div className="mx-auto max-w-4xl">
        {/* En-tête du jeu */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🎯 Alphi - Jeu de Grammaire
              </h1>
              <p className="text-gray-600">
                Bonjour {user.firstName} ! Prêt(e) à jouer ?
              </p>
            </div>
            <div className="flex flex-col items-end text-right">
              <div className="mb-2 text-lg font-semibold text-orange-500">
                Étape {currentStep}/4
              </div>
              <div className="mb-3 h-2 w-32 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${(currentStep / 4) * 100}%` }}
                ></div>
              </div>
              {/* Affichage des vies */}
              {/* Timer avec icône horloge */}
              {startTime > 0 && (
                <div className="mb-3 flex items-center space-x-2 rounded-full bg-blue-50 px-3 py-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">
                    {Math.floor(sessionTime / 60)}:
                    {(sessionTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-1">
                <span className="mr-2 text-sm font-medium text-gray-600">
                  Vies:
                </span>
                {[...Array(3)].map((_, index) => (
                  <div
                    key={index}
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                      index < lives
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-gray-300 text-gray-500 opacity-50"
                    }`}
                  >
                    <span className="text-sm font-bold">♥</span>
                  </div>
                ))}
              </div>
              {gameOver && (
                <div className="mt-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  Jeu Terminé!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Étape 1: Sélection d'image */}
        {currentStep === 1 && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
              📸 Étape 1: Choisissez une image
            </h2>
            <p className="mb-8 text-center text-gray-600">
              Chaque image représente un vers d'un poème. Sélectionnez celle qui
              vous plaît !
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {availablePoems.map((poem) => (
                <div
                  key={poem.id}
                  className="cursor-pointer rounded-2xl border-4 border-transparent bg-gradient-to-br from-orange-200 to-pink-200 p-6 transition-transform duration-200 hover:scale-105 hover:border-orange-400"
                  onClick={() => handlePoemSelection(poem)}
                >
                  <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-orange-300">
                    {poem.image ? (
                      <img
                        src={poem.image}
                        alt="Image du poème"
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <span className="text-6xl">🌅</span>
                    )}
                  </div>
                  <p className="text-center font-medium text-gray-700">
                    {poem.verse}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Étape 2: Attribution des classes de mots */}
        {currentStep === 2 && selectedPoem && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
              🏷️ Étape 2: Attribuez les classes de mots
            </h2>
            <div className="mb-8 rounded-2xl bg-gray-50 p-6">
              <h3 className="mb-4 font-semibold text-gray-800">
                Vers sélectionné :
              </h3>
              <p className="text-lg text-gray-700">
                {(() => {
                  // Create position-based highlighting by mapping word indices to verse positions
                  const participatingWords =
                    selectedPoem.gameParticipatingWords || [];
                  const words = selectedPoem.words;
                  const verse = selectedPoem.verse;

                  // Find word positions in verse by matching sequentially
                  let currentPos = 0;
                  const wordPositions: {
                    start: number;
                    end: number;
                    wordIndex: number;
                    word: string;
                  }[] = [];

                  words.forEach((word, wordIndex) => {
                    const wordText = word.word;
                    const searchPos = verse
                      .toLowerCase()
                      .indexOf(wordText.toLowerCase(), currentPos);

                    if (searchPos >= 0) {
                      wordPositions.push({
                        start: searchPos,
                        end: searchPos + wordText.length,
                        wordIndex,
                        word: wordText,
                      });
                      currentPos = searchPos + wordText.length;
                    }
                  });

                  // Sort by position to maintain order
                  wordPositions.sort((a, b) => a.start - b.start);

                  // Build highlighted verse
                  const highlightedParts: JSX.Element[] = [];
                  let lastPos = 0;

                  wordPositions.forEach((wordPos, index) => {
                    // Add text before this word
                    if (wordPos.start > lastPos) {
                      highlightedParts.push(
                        <span key={`text-${index}`}>
                          {verse.substring(lastPos, wordPos.start)}
                        </span>,
                      );
                    }

                    // Add the word (highlighted if participating)
                    const isParticipating = participatingWords.includes(
                      wordPos.wordIndex,
                    );
                    highlightedParts.push(
                      <span
                        key={`word-${wordPos.wordIndex}`}
                        className={
                          isParticipating ? "font-bold text-orange-600" : ""
                        }
                      >
                        {verse.substring(wordPos.start, wordPos.end)}
                      </span>,
                    );

                    lastPos = wordPos.end;
                  });

                  // Add remaining text after last word
                  if (lastPos < verse.length) {
                    highlightedParts.push(
                      <span key="text-end">{verse.substring(lastPos)}</span>,
                    );
                  }

                  return highlightedParts;
                })()}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-4 font-semibold text-gray-800">
                  Mots à classer :
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Process words to handle groups properly
                    interface ProcessedWordItem {
                      displayText: string;
                      gameWord: GameWord;
                      index: number;
                      isGroup: boolean;
                    }

                    const processedWords: ProcessedWordItem[] = [];
                    const processedIndices = new Set<number>();

                    gameWords.forEach((gameWord, index) => {
                      if (processedIndices.has(index)) return;

                      // Check if this word is part of a group
                      const group = gameWord.groupId
                        ? selectedPoem.wordGroups?.find(
                            (g) => g.id === gameWord.groupId,
                          )
                        : null;

                      if (group) {
                        // For groups, display all group words in original order
                        const participatingWords =
                          selectedPoem.gameParticipatingWords || [];
                        const groupWordsWithIndices = group.wordIndices
                          .map((originalIndex) => {
                            const gameWordIndex = participatingWords.findIndex(
                              (pIndex) => pIndex === originalIndex,
                            );
                            return gameWordIndex >= 0
                              ? {
                                  word: gameWords[gameWordIndex],
                                  gameIndex: gameWordIndex,
                                  originalIndex,
                                }
                              : null;
                          })
                          .filter(
                            (
                              item,
                            ): item is {
                              word: GameWord;
                              gameIndex: number;
                              originalIndex: number;
                            } => item !== null,
                          )
                          .sort((a, b) => a.originalIndex - b.originalIndex); // Maintain original order

                        if (groupWordsWithIndices.length > 0) {
                          // Display as a group
                          const groupText = groupWordsWithIndices
                            .map((item) => item.word.word)
                            .join(" ");
                          processedWords.push({
                            displayText: `${groupText} 👥`,
                            gameWord: gameWord, // Use the first word for class assignment
                            index: index,
                            isGroup: true,
                          });

                          // Mark all group members as processed
                          groupWordsWithIndices.forEach((item) => {
                            processedIndices.add(item.gameIndex);
                          });
                        }
                      } else {
                        // Individual word
                        processedWords.push({
                          displayText: gameWord.word,
                          gameWord: gameWord,
                          index: index,
                          isGroup: false,
                        });
                        processedIndices.add(index);
                      }
                    });

                    return processedWords.map((item, idx) => (
                      <div key={idx} className="rounded-lg bg-gray-50 p-3">
                        <div className="font-semibold text-gray-800">
                          {item.displayText}
                        </div>
                        <select
                          className="mt-2 w-full rounded-md border border-gray-300 p-2"
                          value={item.gameWord.class}
                          onChange={(e) =>
                            handleWordClassAssignmentWithLives(
                              item.index,
                              e.target.value,
                            )
                          }
                        >
                          <option value="">Choisir une classe...</option>
                          {wordClasses.map((wc) => (
                            <option key={wc.name} value={wc.name}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <h4 className="mb-4 font-semibold text-gray-800">
                  Classes de mots :
                </h4>
                <div className="space-y-2">
                  {wordClasses.map((wc) => (
                    <div key={wc.name} className="flex items-center">
                      <span className="text-gray-700">{wc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={proceedToStep3}
                disabled={gameWords.some((gw) => !gw.class) || gameOver}
                className="rounded-full bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Étape Suivante 🚀
              </button>
              {gameOver && (
                <div className="mt-4">
                  <button
                    onClick={startNewGame}
                    className="rounded-full bg-red-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-600"
                  >
                    Nouveau Jeu 🔄
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Étape 3: Glisser-Déposer l'Alphabet */}
        {currentStep === 3 && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
              🔤 Étape 3: Formez le mot mystère !
            </h2>
            <p className="mb-8 text-center text-gray-600">
              Glissez et déposez les lettres colorées dans le bon ordre pour
              former le mot mystère. L'ordre suit celui des mots dans la phrase
              !
            </p>

            {/* Affichage du vers avec couleurs correspondantes */}
            {selectedPoem && (
              <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
                <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
                  Votre sélection :
                </h3>
                <div className="flex flex-wrap justify-center gap-2 text-center text-lg">
                  {(() => {
                    // Group words by groupId, keeping track of original indices for color mapping
                    const groupedWords = new Map<
                      string | null,
                      Array<{ word: string; index: number }>
                    >();

                    gameWords.forEach((wordData, index) => {
                      const groupKey =
                        wordData.groupId || `individual_${index}`;
                      if (!groupedWords.has(groupKey)) {
                        groupedWords.set(groupKey, []);
                      }
                      groupedWords
                        .get(groupKey)!
                        .push({ word: wordData.word, index });
                    });

                    // Render grouped spans
                    return Array.from(groupedWords.entries()).map(
                      ([groupKey, wordsInGroup]) => {
                        // Use the first word's color info for the entire group
                        const firstWordIndex = wordsInGroup[0].index;
                        const firstWordData = gameWords[firstWordIndex];
                        const colorInfo = getWordColorAndLetter(
                          firstWordData,
                          firstWordIndex,
                        );

                        // Combine all words in the group
                        const groupText = wordsInGroup
                          .map((w) => w.word)
                          .join(" ");
                        const isGroup =
                          firstWordData.groupId !== undefined &&
                          wordsInGroup.length > 1;

                        return (
                          <span
                            key={groupKey}
                            className={`rounded-full px-3 py-1 font-medium text-white ${
                              colorInfo && !colorInfo.color.startsWith("#")
                                ? colorInfo.color
                                : "bg-gray-400"
                            }`}
                            style={
                              colorInfo && colorInfo.color.startsWith("#")
                                ? { backgroundColor: colorInfo.color }
                                : undefined
                            }
                          >
                            {groupText}
                            {isGroup && " 👥"}
                          </span>
                        );
                      },
                    );
                  })()}
                </div>
                <p className="mt-3 text-center text-sm text-gray-600">
                  Chaque couleur correspond à une classe grammaticale ou un
                  groupe de mots de vos réponses précédentes
                </p>
              </div>
            )}

            {/* Zone de dépôt pour le mot */}
            <div className="mb-8 rounded-2xl bg-gradient-to-r from-orange-100 to-pink-100 p-6">
              <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
                Mot mystère :
              </h3>
              <div className="mb-4 flex min-h-[80px] items-center justify-center space-x-2 overflow-x-auto">
                {Array.from({
                  length: (selectedPoem?.targetWord || "HORAIRE").length,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white"
                    onDrop={(e) => {
                      e.preventDefault();
                      const letterId = e.dataTransfer.getData("letterId");
                      const letter = availableLetters.find(
                        (l) => l.id === letterId,
                      );
                      if (letter && droppedLetters.length === index) {
                        handleLetterDrop(letter);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {droppedLetters[index] ? (
                      <div
                        className={`h-12 w-12 ${
                          droppedLetters[index].color || "bg-gray-400"
                        } flex cursor-pointer items-center justify-center rounded-lg text-xl font-bold text-white`}
                        style={droppedLetters[index].customStyle}
                        onClick={() =>
                          handleLetterRemove(droppedLetters[index].id)
                        }
                      >
                        {droppedLetters[index].letter}
                      </div>
                    ) : (
                      <span className="text-2xl text-gray-400">
                        {index + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-gray-600">
                Mot actuel:{" "}
                <span className="font-bold">
                  {droppedLetters.map((l) => l.letter).join("")}
                </span>
              </p>
            </div>

            {/* Alphabet disponible */}
            <div className="mb-8">
              <h3 className="mb-4 text-center text-lg font-semibold text-gray-800">
                Alphabet :
              </h3>
              <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-2">
                {availableLetters.map((letter) => (
                  <div
                    key={letter.id}
                    draggable={!gameOver}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("letterId", letter.id);
                    }}
                    onClick={(e) => {
                      if (!gameOver) handleLetterDrop(letter);
                    }}
                    className={`h-10 w-10 ${
                      letter.color || "bg-gray-400"
                    } flex cursor-pointer items-center justify-center rounded-lg text-base font-bold text-white transition-transform hover:scale-110 ${
                      gameOver ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    style={letter.customStyle}
                  >
                    {letter.letter}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                Les lettres colorées correspondent aux classes de mots.
                Glissez-les dans l'ordre des mots de la phrase !
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-4 text-center">
              <button
                onClick={checkWordInStep3}
                disabled={
                  droppedLetters.length !==
                    (selectedPoem?.targetWord || "HORAIRE").length || gameOver
                }
                className="rounded-full bg-teal-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Vérifier le Mot ! ✨
              </button>

              {droppedLetters.length > 0 && !gameOver && (
                <button
                  onClick={() => {
                    setDroppedLetters([]);
                  }}
                  className="ml-4 rounded-full bg-gray-500 px-6 py-2 font-medium text-white transition-colors hover:bg-gray-600"
                >
                  Effacer 🗑️
                </button>
              )}

              {gameOver && (
                <div className="mt-4">
                  <button
                    onClick={resetGame}
                    className="rounded-full bg-red-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-red-600"
                  >
                    Recommencer le Jeu 🎮
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Étape 4: Genre du mot */}
        {currentStep === 4 && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
              ⚡ Étape 4: Quel est le genre du mot ?
            </h2>
            <div className="mb-8 text-center">
              <h3 className="mb-4 text-2xl font-bold text-orange-600">
                {foundWord}
              </h3>
              <p className="text-gray-600">
                Ce mot est-il masculin ou féminin ?
              </p>
            </div>

            <div className="mb-8 flex justify-center space-x-6">
              <button
                onClick={() => handleGenderSelection("masculin")}
                disabled={gameOver || selectedGender !== ""}
                className={`rounded-2xl px-8 py-4 text-lg font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedGender === "masculin"
                    ? "scale-105 bg-blue-500 text-white shadow-lg"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                🔵 Un {foundWord.toLowerCase()}
              </button>
              <button
                onClick={() => handleGenderSelection("féminin")}
                disabled={gameOver || selectedGender !== ""}
                className={`rounded-2xl px-8 py-4 text-lg font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedGender === "féminin"
                    ? "scale-105 bg-pink-500 text-white shadow-lg"
                    : "bg-pink-100 text-pink-700 hover:bg-pink-200"
                }`}
              >
                🔴 Une {foundWord.toLowerCase()}
              </button>
            </div>

            {selectedGender && (
              <div
                className={`rounded-2xl p-6 text-center ${
                  selectedGender === "masculin"
                    ? "bg-gradient-to-r from-green-100 to-teal-100"
                    : "bg-gradient-to-r from-red-100 to-pink-100"
                }`}
              >
                <div className="mb-4 text-4xl">
                  {selectedGender === "masculin" ? "🎉" : "❌"}
                </div>
                <h3 className="mb-2 text-2xl font-bold text-gray-800">
                  {selectedGender === "masculin"
                    ? "Bravo !"
                    : "Pas tout à fait..."}
                </h3>
                <p className="mb-4 text-gray-600">
                  {selectedGender === "masculin"
                    ? `Excellent ! Le mot "horaire" est effectivement masculin. On dit "un horaire".`
                    : `Le mot "horaire" est masculin, pas féminin. On dit "un horaire", pas "une horaire". Par exemple : "Mon horaire de travail commence à 9h."`}
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={resetGame}
                    className="rounded-full bg-green-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-600"
                  >
                    Rejouer 🔄
                  </button>
                  {selectedGender === "féminin" && (
                    <button
                      onClick={() => setSelectedGender("")}
                      className="rounded-full bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
                    >
                      Réessayer 🔁
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
