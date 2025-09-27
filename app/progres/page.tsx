"use client";

import { useState, useEffect } from "react";
import { useUser, useSession } from "@clerk/nextjs";
import {
  TrendingUp,
  Clock,
  Trophy,
  Target,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  ProgressService,
  GameProgress,
} from "@/lib/supabase/services/progressService";
import { PoemService } from "@/lib/supabase/services/poemService";

interface GameData {
  date: string;
  score: number;
  lives: number;
  time: number;
  verse: string;
  remaining_lives: number;
}

export default function ProgresPage() {
  const { user } = useUser();
  const { session } = useSession();
  const [gameHistory, setGameHistory] = useState<GameData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    averageScore: 0,
    averageTime: 0,
    highestScore: 0,
    perfectGames: 0,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return;

      try {
        setIsLoading(true);
        const sessionToken = await session.getToken({ template: "supabase" });

        if (!sessionToken) {
          console.error("No session token available");
          return;
        }

        // Fetch both stats and progress from Supabase
        const [userStats, userProgress, poems] = await Promise.all([
          ProgressService.getUserStats(sessionToken, user!.id),
          ProgressService.getUserProgress(sessionToken, user!.id),
          PoemService.fetchPoems(sessionToken),
        ]);

        // Transform progress data to match GameData format
        const transformedHistory: GameData[] = userProgress.map(
          (progress: GameProgress) => ({
            date: progress.completed_at || new Date().toISOString(),
            score: progress.score,
            time: progress.time_taken,
            verse: poems.find((p) => p.id === progress.poem_id)?.verse ?? "",
            lives: progress.score >= 90 ? 3 : progress.score >= 60 ? 2 : 1,
            remaining_lives: progress.remaining_lives,
          }),
        );

        setGameHistory(transformedHistory);

        // Use Supabase stats if available, otherwise calculate from progress
        if (userStats) {
          setStats({
            totalGames: userStats.total_games_played,
            averageScore: Math.round(userStats.average_score),
            averageTime: Math.round(
              userStats.total_time_played / userStats.total_games_played,
            ),
            highestScore: userStats.best_score,
            perfectGames: transformedHistory.filter(
              (game) => game.remaining_lives === 3,
            ).length,
          });
        } else if (transformedHistory.length > 0) {
          // Fallback: calculate stats from progress data
          const totalScore = transformedHistory.reduce(
            (sum, game) => sum + game.score,
            0,
          );
          const totalTime = transformedHistory.reduce(
            (sum, game) => sum + game.time,
            0,
          );
          const perfectGames = transformedHistory.filter(
            (game) => game.remaining_lives === 3,
          ).length;

          setStats({
            totalGames: transformedHistory.length,
            averageScore: Math.round(totalScore / transformedHistory.length),
            averageTime: Math.round(totalTime / transformedHistory.length),
            highestScore: Math.max(
              ...transformedHistory.map((game) => game.score),
            ),
            perfectGames,
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [session]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearHistory = async () => {
    if (confirm("Êtes-vous sûr de vouloir effacer tout votre historique ?")) {
      // Note: This would require implementing a clear function in ProgressService
      // For now, just reset the local state
      setGameHistory([]);
      setStats({
        totalGames: 0,
        averageScore: 0,
        averageTime: 0,
        highestScore: 0,
        perfectGames: 0,
      });
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Connectez-vous pour voir vos progrès !
          </h1>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à votre historique.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen !w-screen items-center justify-center bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100">
        <div className="text-center">
          <div className="mb-4 text-4xl">📊</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-800">
            Chargement de vos progrès...
          </h1>
          <p className="text-gray-600">
            Récupération de vos données depuis la base de données
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100 p-4">
      <div className="mx-auto max-w-6xl">
        {/* En-tête */}
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                📊 Mes Progrès
              </h1>
              <p className="text-gray-600">
                Bonjour {user.firstName} ! Voici ton parcours d'apprentissage
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/jeu"
                className="rounded-full bg-orange-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
              >
                🎮 Jouer
              </a>
              {gameHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="rounded-full bg-red-500 px-6 py-3 text-sm text-white transition-colors hover:bg-red-600"
                >
                  🗑️ Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {gameHistory.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-lg">
            <div className="mb-6 text-6xl">🎯</div>
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Aucune partie jouée
            </h2>
            <p className="mb-8 text-gray-600">
              Commencez à jouer pour voir vos progrès ici !
            </p>
            <a
              href="/jeu"
              className="inline-block rounded-full bg-orange-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-orange-600"
            >
              🚀 Commencer à jouer
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistiques générales */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-100">Total des parties</p>
                    <p className="text-3xl font-bold">{stats.totalGames}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-200" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-100">Score moyen</p>
                    <p className="text-3xl font-bold">
                      {stats.averageScore / 100}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-100">Temps moyen</p>
                    <p className="text-3xl font-bold">
                      {formatTime(stats.averageTime)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-200" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-100">Meilleur score</p>
                    <p className="text-3xl font-bold">{stats.highestScore}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-yellow-200" />
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-100">Parties parfaites</p>
                    <p className="text-3xl font-bold">{stats.perfectGames}</p>
                  </div>
                  <Target className="h-8 w-8 text-red-200" />
                </div>
              </div>
            </div>

            {/* Historique des parties */}
            <div className="rounded-3xl bg-white p-6 shadow-lg">
              <h2 className="mb-6 flex items-center text-2xl font-bold text-gray-800">
                <Calendar className="mr-2 h-6 w-6" />
                Historique des parties
              </h2>

              <div className="max-h-96 space-y-4 overflow-y-auto">
                {gameHistory
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  )
                  .map((game, index) => (
                    <div
                      key={index}
                      className={`rounded-xl border-l-4 p-4 ${
                        game.remaining_lives === 3
                          ? "border-green-500 bg-green-50"
                          : game.remaining_lives >= 2
                          ? "border-yellow-500 bg-yellow-50"
                          : "border-red-500 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center space-x-4">
                            <span className="text-lg font-bold text-gray-800">
                              Score: {game.score} points
                            </span>
                            <span className="flex items-center text-sm text-gray-600">
                              <Clock className="mr-1 h-4 w-4" />
                              {formatTime(game.time)}
                            </span>
                            <span className="text-sm text-gray-600">
                              Vies:{" "}
                              {Array.from({ length: game.remaining_lives }).map(
                                (_, i) => (
                                  <span
                                    key={i}
                                    className={
                                      i < game.lives
                                        ? "text-red-500"
                                        : "text-gray-300"
                                    }
                                  >
                                    ❤️
                                  </span>
                                ),
                              )}
                            </span>
                          </div>
                          <p className="mb-1 text-sm text-gray-600">
                            <strong>Vers:</strong> {game.verse}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(game.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          {game.remaining_lives === 3 && (
                            <div className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                              ⭐ PARFAIT
                            </div>
                          )}
                          {game.score === stats.highestScore && (
                            <div className="mt-1 rounded-full bg-yellow-500 px-3 py-1 text-xs font-semibold text-white">
                              🏆 RECORD
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
