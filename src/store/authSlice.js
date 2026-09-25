import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi } from '../api'
import { errorMessage, tokenStore } from '../api/client'

const USER_KEY = 'tf_user'

function storedUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
}

function persist({ access_token, refresh_token, user }) {
  tokenStore.set({ access_token, refresh_token })
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const data = await authApi.login(creds)
    persist(data)
    return data.user
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Login failed'))
  }
})

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.register(payload)
    persist(data)
    return data.user
  } catch (err) {
    return rejectWithValue(errorMessage(err, 'Registration failed'))
  }
})

export const refreshUser = createAsyncThunk('auth/me', async () => {
  const user = await authApi.me()
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout()
  tokenStore.clear()
  localStorage.removeItem(USER_KEY)
})

const slice = createSlice({
  name: 'auth',
  initialState: { user: tokenStore.get() ? storedUser() : null, loading: false, error: null },
  reducers: {
    sessionExpired(state) {
      state.user = null
      localStorage.removeItem(USER_KEY)
    },
    clearError(state) { state.error = null },
  },
  extraReducers: (b) => {
    for (const thunk of [login, register]) {
      b.addCase(thunk.pending, (s) => { s.loading = true; s.error = null })
      b.addCase(thunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload })
      b.addCase(thunk.rejected, (s, a) => { s.loading = false; s.error = a.payload })
    }
    b.addCase(refreshUser.fulfilled, (s, a) => { s.user = a.payload })
    b.addCase(logout.fulfilled, (s) => { s.user = null })
  },
})

export const { sessionExpired, clearError } = slice.actions
export default slice.reducer
