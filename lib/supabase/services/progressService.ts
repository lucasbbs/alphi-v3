import { createClerkSupabaseClientFromHook } from '../client'

export interface GameProgress {
  id?: string
  user_id?: string
  poem_id: string
  completed_at?: string
  time_taken: number // in seconds
  score: number
  created_at?: string
  remaining_lives: number
}

export interface GameStats {
  id?: string
  user_id?: string
  total_games_played: number
  total_time_played: number // in seconds
  average_score: number
  best_score: number
  poems_completed: string[]
  created_at?: string
  updated_at?: string
}

// Legacy game data format from localStorage
export interface LegacyGameData {
  date: string
  score: number
  lives: number
  time: number
  verse: string
}

export class ProgressService {
  static async saveGameProgress(
    sessionToken: string, 
    poemId: string, 
    timeTaken: number, 
    score: number,
    userId: string,
    remaining_lives: number
  ): Promise<GameProgress | null> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const progressData: Omit<GameProgress, 'id'  | 'created_at'> = {
        poem_id: poemId,
        time_taken: timeTaken,
        score: score,
        user_id: userId,
        remaining_lives: remaining_lives,
        completed_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('user_progress')
        .insert([progressData])
        .select()
        .single()

      if (error) {
        console.error('Error saving game progress:', error)
        throw error
      }

      // Update user stats after saving progress
      await this.updateUserStats(sessionToken, poemId, timeTaken, score, userId)

      return data
    } catch (error) {
      console.error('Failed to save game progress:', error)
      return null
    }
  }

  static async getUserProgress(sessionToken: string, user_id: string): Promise<GameProgress[]> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user_id)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error fetching user progress:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch user progress:', error)
      return []
    }
  }

  static async getUserStats(sessionToken: string, user_id: string): Promise<GameStats | null> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user_id)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error fetching user stats:', error)
        throw error
      }

      return data || null
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      return null
    }
  }

  private static async updateUserStats(
    sessionToken: string,
    poemId: string,
    timeTaken: number,
    score: number,
    userId: string
  ): Promise<void> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      // Get current stats
      const currentStats = await this.getUserStats(sessionToken, userId)
      
      if (currentStats) {
        // Update existing stats
        const totalGames = currentStats.total_games_played + 1
        const totalTime = currentStats.total_time_played + timeTaken
        const newAverageScore = Math.round(((currentStats.average_score/100 * currentStats.total_games_played + score) / totalGames)*100)
        const newBestScore = Math.max(currentStats.best_score, score)
        
        const updatedPoemsCompleted = Array.from(new Set([...currentStats.poems_completed, poemId]))
        
        const { error } = await supabase
          .from('user_stats')
          .update({
            total_games_played: totalGames,
            total_time_played: totalTime,
            average_score: Math.round(newAverageScore * 100) / 100, // Round to 2 decimal places
            best_score: newBestScore,
            poems_completed: updatedPoemsCompleted,
            user_id: userId
          })
          .eq('id', currentStats.id)

        if (error) {
          console.error('Error updating user stats:', error)
        }
      } else {
        // Create new stats
        const { error } = await supabase
          .from('user_stats')
          .insert([{
            user_id: userId,
            total_games_played: 1,
            total_time_played: timeTaken,
            average_score: score*100,
            best_score: score,
            poems_completed: [poemId]
          }])

        if (error) {
          console.error('Error creating user stats:', error)
        }
      }
    } catch (error) {
      console.error('Failed to update user stats:', error)
    }
  }

}