import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { PoemService, LocalPoem, type LocalWordGroup, type GameWord } from '@/lib/supabase/services/poemService'

// Re-export types from service for compatibility
export type { LocalWordGroup as WordGroup, GameWord }
export type Poem = LocalPoem

interface GameState {
  poems: Poem[]
  word_classes: string[]
  currentEditingPoem: Poem | null
  loading: boolean
  error: string | null
}

export const fetchPoems = createAsyncThunk(
  'game/fetchPoems',
  async (sessionToken: string) => {
    const poems = await PoemService.fetchPoems(sessionToken)
    return poems.length > 0 ? poems : []
  }
)

export const createPoem = createAsyncThunk(
  'game/createPoem',
  async ({ sessionToken, poem }: { sessionToken: string; poem: Poem }) => {
    const createdPoem = await PoemService.createPoem(sessionToken, poem)
    if (!createdPoem) {
      throw new Error('Failed to create poem')
    }
    createdPoem.wordClasses = poem.wordClasses ?? []
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
    updatedPoem.wordClasses = poem.wordClasses ?? []
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
  poems: [],
  word_classes: [],
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
        state.word_classes = Array.from(
          new Set(
            action.payload.flatMap(poem => poem.wordClasses ?? [])
          )
        )
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
        state.word_classes = Array.from(
          new Set([
            ...state.word_classes,
            ...(action.payload.wordClasses ?? [])
          ])
        )
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
          state.word_classes = Array.from(
            new Set(
              state.poems.flatMap(poem => poem.wordClasses ?? [])
            )
          )
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
        state.word_classes = Array.from(
          new Set(
            state.poems.flatMap(poem => poem.wordClasses ?? [])
          )
        )
      })
      .addCase(deletePoem.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete poem'
      })
  }
})

export const { setCurrentEditingPoem, clearCurrentEditingPoem, clearError } = gameSlice.actions
export default gameSlice.reducer
