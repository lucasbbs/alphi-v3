import { createClerkSupabaseClientFromHook } from '../client'
import { Poem as SupabasePoem } from '../types'
import { WordClassesService } from './wordClassesServices'

// Transform Supabase poem to local poem format
export function transformSupabasePoem(supabasePoem: SupabasePoem): LocalPoem {
  // Convert Supabase word groups to local format
  const localWordGroups: LocalWordGroup[] = supabasePoem.word_groups 
    ? (Array.isArray(supabasePoem.word_groups) ? supabasePoem.word_groups : []).map((group: any) => ({
        id: group.id || `group-${Math.random()}`,
        name: group.name || 'Group',
        color: group.color || '#EF4444',
        wordIndices: group.word_indices || group.wordIndices || []
      }))
    : []

  return {
    id: supabasePoem.id,
    image: supabasePoem.image,
    verse: supabasePoem.content,
    words: supabasePoem.words || [],
    wordGroups: localWordGroups,
    targetWord: supabasePoem.target_word,
    targetWordGender: (supabasePoem.target_word_gender as 'masculin' | 'féminin') || 'masculin',
    createdAt: supabasePoem.created_at,
    gameParticipatingWords: supabasePoem.game_participating_words || [],
    wordColors: supabasePoem.word_colors ? JSON.parse(JSON.stringify(supabasePoem.word_colors)) : {},
    wordClasses: []
  }
}

// Transform local poem to Supabase format
export function transformLocalPoem(localPoem: LocalPoem): Partial<SupabasePoem> {
  // Convert local word groups to Supabase format
  const supabaseWordGroups = localPoem.wordGroups.map(group => ({
    id: group.id,
    name: group.name,
    color: group.color,
    word_indices: group.wordIndices
  }))

  return {
    id: localPoem.id, // Include the ID for updates
    title: `Poem ${localPoem.id}`,
    content: localPoem.verse,
    verses: [localPoem.verse],
    words: localPoem.words,
    target_word: localPoem.targetWord,
    target_word_gender: localPoem.targetWordGender,
    game_participating_words: localPoem.gameParticipatingWords || [],
    word_groups: supabaseWordGroups as any,
    word_colors: localPoem.wordColors || {},
    difficulty_level: 'medium',
    image: localPoem.image // Include image
  }
}

// Local poem interface (matches current gameSlice)
export interface LocalPoem {
  id: string
  image: string | null
  verse: string
  words: GameWord[]
  wordGroups: LocalWordGroup[]
  targetWord: string
  targetWordGender: 'masculin' | 'féminin'
  createdAt: string
  gameParticipatingWords?: number[]
  wordColors?: {[key: number]: string}
  wordClasses?: string[] // Available word classes for this poem
}

// Word classes interface for database storage
export interface GameWord {
  word: string
  class: string
  isSelected: boolean
  groupId?: string
}

export interface LocalWordGroup {
  id: string
  name: string
  color: string
  wordIndices: number[]
}

export class PoemService {
  private async getSupabaseClient() {
    // This needs to be called from a component with access to Clerk session
    throw new Error('PoemService methods must be called from components with access to Clerk session')
  }

  static async fetchPoems(sessionToken: string): Promise<LocalPoem[]> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const { data, error } = await supabase
        .from('poems')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching poems:', error)
        throw error
      }

      const poems = (data || []).map(transformSupabasePoem)

      if (poems.length > 0) {
        const poemIds = poems.map(poem => poem.id).filter(Boolean)
        const wordClassesMap = await WordClassesService.fetchWordClassesMap(sessionToken, poemIds)
        poems.forEach(poem => {
          poem.wordClasses = wordClassesMap[poem.id] ?? []
        })
      }

      return poems
    } catch (error) {
      console.error('Failed to fetch poems:', error)
      return []
    }
  }

  static async createPoem(sessionToken: string, poem: LocalPoem): Promise<LocalPoem | null> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const supabasePoem = transformLocalPoem(poem)
      
      const { data, error } = await supabase
        .from('poems')
        .insert([supabasePoem])
        .select()
        .single()

      if (error) {
        console.error('Error creating poem:', error)
        throw error
      }

      return transformSupabasePoem(data)
    } catch (error) {
      console.error('Failed to create poem:', error)
      return null
    }
  }

  static async updatePoem(sessionToken: string, poem: LocalPoem): Promise<LocalPoem | null> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)
      
      const supabasePoem = transformLocalPoem(poem)
      
      const { data, error } = await supabase
        .from('poems')
        .update(supabasePoem)
        .eq('id', poem.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating poem:', error)
        throw error
      }

      return transformSupabasePoem(data)
    } catch (error) {
      console.error('Failed to update poem:', error)
      return null
    }
  }

  static async deletePoem(sessionToken: string, poemId: string): Promise<boolean> {
    try {
      const supabase = createClerkSupabaseClientFromHook(sessionToken)

      // Ensure dependent word classes are removed to satisfy FK constraint
      await WordClassesService.deleteWordClasses(sessionToken, poemId)

      const { error } = await supabase
        .from('poems')
        .delete()
        .eq('id', poemId)

      if (error) {
        console.error('Error deleting poem:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Failed to delete poem:', error)
      return false
    }
  }
}
