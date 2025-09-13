'use client'

import { useState, useEffect } from 'react'
import { useUser, useSession } from '@clerk/nextjs'
import { TrendingUp, Clock, Trophy, Target, Calendar, BarChart3 } from 'lucide-react'
import { ProgressService, GameProgress, GameStats } from '@/lib/supabase/services/progressService'

interface GameData {
  date: string
  score: number
  lives: number
  time: number
  verse: string
}

export default function ProgresPage() {
  const { user } = useUser()
  const { session } = useSession()
  const [gameHistory, setGameHistory] = useState<GameData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalGames: 0,
    averageScore: 0,
    averageTime: 0,
    highestScore: 0,
    perfectGames: 0
  })

  useEffect(() => {
    const fetchUserData = async () => {
      if (!session) return
      
      try {
        setIsLoading(true)
        const sessionToken = await session.getToken({ template: 'supabase' })
        
        if (!sessionToken) {
          console.error('No session token available')
          return
        }
        
        // Fetch both stats and progress from Supabase
        const [userStats, userProgress] = await Promise.all([
          ProgressService.getUserStats(sessionToken),
          ProgressService.getUserProgress(sessionToken)
        ])
        
        // Transform progress data to match GameData format
        const transformedHistory: GameData[] = userProgress.map((progress: GameProgress) => ({
          date: progress.completed_at || new Date().toISOString(),
          score: progress.score,
          time: progress.time_taken,
          verse: `Poem ${progress.poem_id.substring(0, 8)}...`, // Short poem ID reference
          lives: progress.score >= 90 ? 3 : progress.score >= 60 ? 2 : 1 // Estimate lives based on score
        }))
        
        setGameHistory(transformedHistory)
        
        // Use Supabase stats if available, otherwise calculate from progress
        if (userStats) {
          setStats({
            totalGames: userStats.total_games_played,
            averageScore: Math.round(userStats.average_score),
            averageTime: Math.round(userStats.total_time_played / userStats.total_games_played),
            highestScore: userStats.best_score,
            perfectGames: transformedHistory.filter(game => game.lives === 3).length
          })
        } else if (transformedHistory.length > 0) {
          // Fallback: calculate stats from progress data
          const totalScore = transformedHistory.reduce((sum, game) => sum + game.score, 0)
          const totalTime = transformedHistory.reduce((sum, game) => sum + game.time, 0)
          const perfectGames = transformedHistory.filter(game => game.lives === 3).length
          
          setStats({
            totalGames: transformedHistory.length,
            averageScore: Math.round(totalScore / transformedHistory.length),
            averageTime: Math.round(totalTime / transformedHistory.length),
            highestScore: Math.max(...transformedHistory.map(game => game.score)),
            perfectGames
          })
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUserData()
  }, [session])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearHistory = async () => {
    if (confirm('Êtes-vous sûr de vouloir effacer tout votre historique ?')) {
      // Note: This would require implementing a clear function in ProgressService
      // For now, just reset the local state
      setGameHistory([])
      setStats({
        totalGames: 0,
        averageScore: 0,
        averageTime: 0,
        highestScore: 0,
        perfectGames: 0
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Connectez-vous pour voir vos progrès !</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à votre historique.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Chargement de vos progrès...</h1>
          <p className="text-gray-600">Récupération de vos données depuis la base de données</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gradient-to-br from-orange-100 via-pink-50 to-teal-100 p-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">📊 Mes Progrès</h1>
              <p className="text-gray-600">Bonjour {user.firstName} ! Voici ton parcours d'apprentissage</p>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/jeu"
                className="bg-orange-500 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-600 transition-colors"
              >
                🎮 Jouer
              </a>
              {gameHistory.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="bg-red-500 text-white px-6 py-3 rounded-full text-sm hover:bg-red-600 transition-colors"
                >
                  🗑️ Effacer
                </button>
              )}
            </div>
          </div>
        </div>

        {gameHistory.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Aucune partie jouée</h2>
            <p className="text-gray-600 mb-8">Commencez à jouer pour voir vos progrès ici !</p>
            <a 
              href="/jeu"
              className="bg-orange-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-orange-600 transition-colors inline-block"
            >
              🚀 Commencer à jouer
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistiques générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total des parties</p>
                    <p className="text-3xl font-bold">{stats.totalGames}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Score moyen</p>
                    <p className="text-3xl font-bold">{stats.averageScore}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Temps moyen</p>
                    <p className="text-3xl font-bold">{formatTime(stats.averageTime)}</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm">Meilleur score</p>
                    <p className="text-3xl font-bold">{stats.highestScore}</p>
                  </div>
                  <Trophy className="w-8 h-8 text-yellow-200" />
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Parties parfaites</p>
                    <p className="text-3xl font-bold">{stats.perfectGames}</p>
                  </div>
                  <Target className="w-8 h-8 text-red-200" />
                </div>
              </div>
            </div>

            {/* Historique des parties */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                <Calendar className="w-6 h-6 mr-2" />
                Historique des parties
              </h2>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {gameHistory
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((game, index) => (
                    <div 
                      key={index}
                      className={`rounded-xl p-4 border-l-4 ${
                        game.lives === 3 
                          ? 'bg-green-50 border-green-500' 
                          : game.lives >= 2 
                          ? 'bg-yellow-50 border-yellow-500' 
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <span className="text-lg font-bold text-gray-800">
                              Score: {game.score} points
                            </span>
                            <span className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatTime(game.time)}
                            </span>
                            <span className="text-sm text-gray-600">
                              Vies: {Array.from({length: 3}).map((_, i) => (
                                <span key={i} className={i < game.lives ? "text-red-500" : "text-gray-300"}>
                                  ❤️
                                </span>
                              ))}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Vers:</strong> {game.verse}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(game.date)}
                          </p>
                        </div>
                        <div className="text-right">
                          {game.lives === 3 && (
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                              ⭐ PARFAIT
                            </div>
                          )}
                          {game.score === stats.highestScore && (
                            <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold mt-1">
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
  )
}