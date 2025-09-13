import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { PoemService, LocalPoem, type LocalWordGroup, type GameWord } from '@/lib/supabase/services/poemService'

// Re-export types from service for compatibility
export type { LocalWordGroup as WordGroup, GameWord }
export type Poem = LocalPoem

interface GameState {
  poems: Poem[]
  currentEditingPoem: Poem | null
  loading: boolean
  error: string | null
}

// Default poems for fallback
const getDefaultPoems = (): Poem[] => [
  {
    id: 'default-1',
    image: '/logo.png',
    verse: 'Demain, l\'hiver viendra poser sa main froide sur nos rêves.',
    words: [
      { word: 'Demain', class: 'adverbe', isSelected: false },
      { word: 'l\'', class: 'déterminant défini', isSelected: false },
      { word: 'viendra', class: 'verbe', isSelected: false, groupId: 'verbe-groupe-1' },
      { word: 'poser', class: 'verbe', isSelected: false, groupId: 'verbe-groupe-1' },
      { word: 'sa', class: 'déterminant possessif', isSelected: false },
      { word: 'froide', class: 'adjectif', isSelected: false },
      { word: 'sur', class: 'préposition', isSelected: false },
      { word: 'rêves', class: 'nom commun', isSelected: false }
    ],
    wordGroups: [
      {
        id: 'verbe-groupe-1',
        name: 'Groupe verbal',
        color: '#10B981',
        wordIndices: [2, 3]
      }
    ],
    targetWord: 'HORAIRE',
    targetWordGender: 'masculin',
    createdAt: new Date().toISOString(),
    gameParticipatingWords: [0, 2, 3, 5],
    wordColors: { 0: "#EF4444", 2: "#10B981", 3: "#10B981", 5: "#F59E0B" }
  }
]

// Async thunks for Supabase operations
export const fetchPoems = createAsyncThunk(
  'game/fetchPoems',
  async (sessionToken: string) => {
    const poems = await PoemService.fetchPoems(sessionToken)
    return poems.length > 0 ? poems : getDefaultPoems()
  }
)

export const createPoem = createAsyncThunk(
  'game/createPoem',
  async ({ sessionToken, poem }: { sessionToken: string; poem: Poem }) => {
    const createdPoem = await PoemService.createPoem(sessionToken, poem)
    if (!createdPoem) {
      throw new Error('Failed to create poem')
    }
    return createdPoem
  }
)

export const updatePoem = createAsyncThunk(
  'game/updatePoem',
  async ({ sessionToken, poem }: { sessionToken: string; poem: Poem }) => {
    const updatedPoem = await PoemService.updatePoem(sessionToken, poem)
    if (!updatedPoem) {
      throw new Error('Failed to update poem')
    }
    return updatedPoem
  }
)

export const deletePoem = createAsyncThunk(
  'game/deletePoem',
  async ({ sessionToken, poemId }: { sessionToken: string; poemId: string }) => {
    const success = await PoemService.deletePoem(sessionToken, poemId)
    if (!success) {
      throw new Error('Failed to delete poem')
    }
    return poemId
  }
)

const initialState: GameState = {
  poems: getDefaultPoems(),
  currentEditingPoem: null,
  loading: false,
  error: null
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setCurrentEditingPoem: (state, action: PayloadAction<Poem | null>) => {
      state.currentEditingPoem = action.payload
    },
    clearCurrentEditingPoem: (state) => {
      state.currentEditingPoem = null
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch poems
    builder
      .addCase(fetchPoems.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPoems.fulfilled, (state, action) => {
        state.loading = false
        state.poems = action.payload
      })
      .addCase(fetchPoems.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch poems'
      })

    // Create poem
    builder
      .addCase(createPoem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createPoem.fulfilled, (state, action) => {
        state.loading = false
        state.poems.push(action.payload)
      })
      .addCase(createPoem.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create poem'
      })

    // Update poem
    builder
      .addCase(updatePoem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePoem.fulfilled, (state, action) => {
        state.loading = false
        const index = state.poems.findIndex(poem => poem.id === action.payload.id)
        if (index !== -1) {
          state.poems[index] = action.payload
        }
      })
      .addCase(updatePoem.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update poem'
      })

    // Delete poem
    builder
      .addCase(deletePoem.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deletePoem.fulfilled, (state, action) => {
        state.loading = false
        state.poems = state.poems.filter(poem => poem.id !== action.payload)
      })
      .addCase(deletePoem.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete poem'
      })
  }
})

export const { setCurrentEditingPoem, clearCurrentEditingPoem, clearError } = gameSlice.actions
export default gameSlice.reducer