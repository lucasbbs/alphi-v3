import { createClerkSupabaseClientFromHook } from '../client'

export interface WordClassesRecord {
  id: string
  word_classes: string[]
  created_at?: string
}

export class WordClassesService {
  private static getClient(sessionToken: string) {
    if (!sessionToken) {
      throw new Error('Session token is required to access word classes')
    }
    return createClerkSupabaseClientFromHook(sessionToken)
  }

  static async fetchWordClasses(sessionToken: string, poemId: string): Promise<string[]> {
    if (!poemId) {
      return []
    }

    try {
      const supabase = this.getClient(sessionToken)
      const { data, error } = await supabase
        .from('word_classes')
        .select('word_classes')
        .eq('id', poemId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching word classes:', error)
        return []
      }

      return data?.word_classes ?? []
    } catch (error) {
      console.error('Failed to fetch word classes:', error)
      return []
    }
  }

  static async fetchWordClassesMap(
    sessionToken: string,
    poemIds: string[]
  ): Promise<Record<string, string[]>> {
    if (!poemIds.length) {
      return {}
    }

    try {
      const supabase = this.getClient(sessionToken)
      const { data, error } = await supabase
        .from('word_classes')
        .select('id, word_classes')
        .in('id', poemIds)

      if (error) {
        console.error('Error fetching word classes map:', error)
        return {}
      }

      return (data || []).reduce<Record<string, string[]>>((acc, record) => {
        if (record?.id) {
          acc[record.id] = Array.isArray(record.word_classes)
            ? record.word_classes
            : []
        }
        return acc
      }, {})
    } catch (error) {
      console.error('Failed to fetch word classes map:', error)
      return {}
    }
  }

  static async saveWordClasses(
    sessionToken: string,
    poemId: string,
    wordClasses: string[]
  ): Promise<WordClassesRecord | null> {
    if (!poemId) {
      throw new Error('Poem ID is required to save word classes')
    }

    try {
      const supabase = this.getClient(sessionToken)
      const payload = {
        id: poemId,
        word_classes: wordClasses ?? []
      }

      const { data, error } = await supabase
        .from('word_classes')
        .upsert([payload])
        .select()
        .single()

      if (error) {
        console.error('Error saving word classes:', error)
        throw error
      }

      return data as WordClassesRecord
    } catch (error) {
      console.error('Failed to save word classes:', error)
      return null
    }
  }

  static async deleteWordClasses(sessionToken: string, poemId: string): Promise<boolean> {
    if (!poemId) {
      return true
    }

    try {
      const supabase = this.getClient(sessionToken)
      const { error } = await supabase
        .from('word_classes')
        .delete()
        .eq('id', poemId)

      if (error) {
        console.error('Error deleting word classes:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Failed to delete word classes:', error)
      return false
    }
  }
}
