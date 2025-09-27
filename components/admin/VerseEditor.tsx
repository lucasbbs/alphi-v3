"use client";

import React, { useState, useEffect, useRef } from "react";
import { GameWord, WordGroup } from "@/lib/store/gameSlice";

interface VerseEditorProps {
  verse: string;
  words: GameWord[];
  wordGroups: WordGroup[];
  gameParticipatingWords?: number[];
  wordColors?: { [key: number]: string };
  onVerseChange: (verse: string) => void;
  onWordsChange: (words: GameWord[]) => void;
  onWordGroupsChange: (groups: WordGroup[]) => void;
  onGameParticipatingWordsChange?: (participatingWords: number[]) => void;
  onWordColorsChange?: (wordColors: { [key: number]: string }) => void;
}

export default function VerseEditor({
  verse,
  words = [],
  wordGroups = [],
  gameParticipatingWords: initialGameParticipatingWords = [],
  wordColors: initialWordColors = {},
  onVerseChange,
  onWordsChange,
  onWordGroupsChange,
  onGameParticipatingWordsChange,
  onWordColorsChange,
}: VerseEditorProps) {
  const [parsedWords, setParsedWords] = useState<GameWord[]>([]);
  const [selectedWordIndices, setSelectedWordIndices] = useState<number[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#EF4444");
  const [gameParticipatingWords, setGameParticipatingWords] = useState<
    number[]
  >(initialGameParticipatingWords);
  const [wordColors, setWordColors] = useState<{ [key: number]: string }>(
    initialWordColors,
  );
  const [openPopovers, setOpenPopovers] = useState<{ [key: number]: boolean }>(
    {},
  );
  const prevVerseRef = useRef<string>("");

  // Sync local state with prop changes (e.g., when loading existing poems)
  useEffect(() => {
    setGameParticipatingWords(initialGameParticipatingWords);
  }, [initialGameParticipatingWords]);

  useEffect(() => {
    setWordColors(initialWordColors);
  }, [initialWordColors]);

  // Clear participation and colors only when verse actually changes (avoid index drift)
  useEffect(() => {
    if (
      verse !== prevVerseRef.current &&
      prevVerseRef.current !== "" &&
      verse !== ""
    ) {
      // Only clear if verse actually changed from a non-empty previous value
      setGameParticipatingWords([]);
      setWordColors({});
      onGameParticipatingWordsChange?.([]);
      onWordColorsChange?.({});
    }
    prevVerseRef.current = verse;
  }, [verse, onGameParticipatingWordsChange, onWordColorsChange]);

  // Fonction d'attribution automatique des classes grammaticales
  const autoClassifyWord = (word: string): string => {
    const cleanWord = word.toLowerCase().replace(/['']/g, "'");

    // Déterminants définis
    if (
      ["le", "la", "les", "l'", "du", "des", "au", "aux"].includes(cleanWord)
    ) {
      return "déterminant défini";
    }

    // Déterminants possessifs
    if (
      [
        "mon",
        "ma",
        "mes",
        "ton",
        "ta",
        "tes",
        "son",
        "sa",
        "ses",
        "notre",
        "nos",
        "votre",
        "vos",
        "leur",
        "leurs",
      ].includes(cleanWord)
    ) {
      return "déterminant possessif";
    }

    // Prépositions communes
    if (
      [
        "à",
        "de",
        "dans",
        "sur",
        "sous",
        "avec",
        "sans",
        "pour",
        "par",
        "entre",
        "vers",
        "chez",
        "depuis",
        "pendant",
        "après",
        "avant",
      ].includes(cleanWord)
    ) {
      return "préposition";
    }

    // Pronoms
    if (
      [
        "je",
        "tu",
        "il",
        "elle",
        "nous",
        "vous",
        "ils",
        "elles",
        "me",
        "te",
        "se",
        "lui",
        "leur",
        "y",
        "en",
        "qui",
        "que",
        "dont",
        "où",
      ].includes(cleanWord)
    ) {
      return "pronom";
    }

    // Conjonctions
    if (
      [
        "et",
        "ou",
        "mais",
        "car",
        "donc",
        "or",
        "ni",
        "que",
        "si",
        "comme",
        "quand",
        "lorsque",
        "puisque",
      ].includes(cleanWord)
    ) {
      return "conjonction";
    }

    // Adverbes fréquents
    if (
      [
        "très",
        "bien",
        "mal",
        "plus",
        "moins",
        "beaucoup",
        "peu",
        "trop",
        "assez",
        "encore",
        "déjà",
        "jamais",
        "toujours",
        "souvent",
        "parfois",
        "hier",
        "aujourd'hui",
        "demain",
        "maintenant",
        "bientôt",
        "tard",
        "tôt",
      ].includes(cleanWord)
    ) {
      return "adverbe";
    }

    // Verbes courants (infinitif et conjugaisons fréquentes)
    if (
      cleanWord.match(/(er|ir|re|oir)$/) ||
      [
        "est",
        "était",
        "sera",
        "avoir",
        "être",
        "faire",
        "aller",
        "venir",
        "voir",
        "savoir",
        "pouvoir",
        "vouloir",
        "dire",
        "prendre",
        "donner",
        "mettre",
        "porter",
        "laisser",
        "rester",
        "devenir",
        "tenir",
        "arriver",
        "passer",
        "partir",
        "sortir",
        "entrer",
        "monter",
        "descendre",
        "tomber",
        "viendra",
        "viendrait",
      ].includes(cleanWord)
    ) {
      return "verbe";
    }

    // Adjectifs courants (patterns simples)
    if (cleanWord.match(/(able|ible|eux|euse|ique|al|elle|if|ive|ant|ent)$/)) {
      return "adjectif";
    }

    // Noms (par défaut pour les mots non classés)
    return "nom commun";
  };

  // Analyser le vers en mots quand il change
  useEffect(() => {
    if (verse.trim()) {
      const wordTokens = verse
        .split(/(\s+|[.,;:!?()\"'’])/)
        .filter(
          (token) =>
            token.trim() &&
            !/^\s+$/.test(token) &&
            !/^[.,;:!?()\"'’]+$/.test(token),
        );

      const newWords: GameWord[] = wordTokens.map((word, index) => {
        const existingWord = words.find((w) => w.word === word);
        return (
          existingWord || {
            word,
            class: autoClassifyWord(word), // Attribution automatique
            isSelected: false,
          }
        );
      });

      setParsedWords(newWords);
      onWordsChange(newWords);
    } else {
      setParsedWords([]);
      onWordsChange([]);
    }
  }, [verse]);

  const handleClassChange = (wordIndex: number, className: string) => {
    const updatedWords = [...parsedWords];
    const word = parsedWords[wordIndex];

    // Check if this word is part of a group
    const group = word?.groupId
      ? (wordGroups ?? []).find((g) => g.id === word.groupId)
      : null;

    if (group) {
      // Update class for all words in the group
      group.wordIndices.forEach((groupIndex) => {
        if (updatedWords[groupIndex]) {
          updatedWords[groupIndex] = {
            ...updatedWords[groupIndex],
            class: className,
          };
        }
      });
    } else {
      // Update individual word
      updatedWords[wordIndex] = {
        ...updatedWords[wordIndex],
        class: className,
      };
    }

    setParsedWords(updatedWords);
    onWordsChange(updatedWords);
  };

  const handleWordSelection = (wordIndex: number) => {
    setSelectedWordIndices((prev) =>
      prev.includes(wordIndex)
        ? prev.filter((i) => i !== wordIndex)
        : [...prev, wordIndex].sort((a, b) => a - b),
    );
  };

  const createWordGroup = () => {
    if (selectedWordIndices.length === 0 || !newGroupName.trim()) return;

    const newGroup: WordGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      color: newGroupColor,
      wordIndices: selectedWordIndices,
    };

    // Update words to include group ID
    const updatedWords = [...parsedWords];
    selectedWordIndices.forEach((index) => {
      updatedWords[index] = { ...updatedWords[index], groupId: newGroup.id };
    });

    // Update groups
    const updatedGroups = [...wordGroups, newGroup];

    setParsedWords(updatedWords);
    onWordsChange(updatedWords);
    onWordGroupsChange(updatedGroups);

    // Reset selection and form
    setSelectedWordIndices([]);
    setNewGroupName("");
    setNewGroupColor("#EF4444");
    setIsCreatingGroup(false);
  };

  const removeWordGroup = (groupId: string) => {
    // Remove group from words
    const updatedWords = parsedWords.map((word) =>
      word.groupId === groupId ? { ...word, groupId: undefined } : word,
    );

    // Remove group from groups array
    const updatedGroups = wordGroups.filter((group) => group.id !== groupId);

    setParsedWords(updatedWords);
    onWordsChange(updatedWords);
    onWordGroupsChange(updatedGroups);
  };

  const getWordColor = (word: GameWord, index: number) => {
    // If word is not participating in the game, show light gray
    if (!gameParticipatingWords.includes(index)) {
      return { className: "bg-gray-300" };
    }

    // For participating words: show custom color if set, otherwise light gray
    if (wordColors[index]) {
      return { backgroundColor: wordColors[index] };
    }

    // Default light gray for participating words without custom color
    return { className: "bg-gray-300" };
  };

  const handleWordParticipationToggle = (index: number) => {
    setGameParticipatingWords((prev) => {
      let newParticipatingWords = [...prev];
      let newWordColors = { ...wordColors };

      // Check if this word is part of a group
      const word = parsedWords[index];
      const group = word?.groupId
        ? (wordGroups ?? []).find((g) => g.id === word.groupId)
        : null;

      if (group) {
        // Handle group participation - all words in group together
        const firstIndex = group.wordIndices[0];
        const isGroupParticipating = prev.includes(firstIndex);

        if (isGroupParticipating) {
          // Remove entire group from game and clear colors
          group.wordIndices.forEach((groupIndex) => {
            newParticipatingWords = newParticipatingWords.filter(
              (i) => i !== groupIndex,
            );
            delete newWordColors[groupIndex];
          });
        } else {
          // Add entire group to game with default colors
          group.wordIndices.forEach((groupIndex) => {
            if (!newParticipatingWords.includes(groupIndex)) {
              newParticipatingWords.push(groupIndex);
            }
            newWordColors[groupIndex] = "#D1D5DB";
          });
        }
      } else {
        // Handle individual word participation
        if (prev.includes(index)) {
          // Remove from game and clear custom color
          newParticipatingWords = prev.filter((i) => i !== index);
          delete newWordColors[index];
        } else {
          // Add to game with default light gray color
          newParticipatingWords = [...prev, index];
          newWordColors[index] = "#D1D5DB";
        }
      }

      // Sync back to parent
      onGameParticipatingWordsChange?.(newParticipatingWords);
      setWordColors(newWordColors);
      onWordColorsChange?.(newWordColors);

      return newParticipatingWords;
    });
  };

  const handleWordColorChange = (index: number, color: string) => {
    const word = parsedWords[index];
    const group = word?.groupId
      ? (wordGroups ?? []).find((g) => g.id === word.groupId)
      : null;

    let newWordColors = { ...wordColors };

    if (group) {
      // Update color for all words in the group
      group.wordIndices.forEach((groupIndex) => {
        newWordColors[groupIndex] = color;
      });
    } else {
      // Update individual word color
      newWordColors[index] = color;
    }

    setWordColors(newWordColors);
    onWordColorsChange?.(newWordColors);
  };

  const togglePopover = (index: number, open: boolean) => {
    setOpenPopovers((prev) => ({ ...prev, [index]: open }));
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Vers du poème
        </label>
        <textarea
          value={verse}
          onChange={(e) => onVerseChange(e.target.value)}
          placeholder="Saisissez le vers du poème ici..."
          className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          rows={3}
        />
        <p className="mt-1 text-sm text-gray-500">
          Le vers sera automatiquement analysé et les classes grammaticales
          attribuées. Vous pouvez les modifier si nécessaire.
        </p>
      </div>
    </div>
  );
}
