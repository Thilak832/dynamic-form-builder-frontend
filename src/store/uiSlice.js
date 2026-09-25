import { createSlice } from '@reduxjs/toolkit'

let nextId = 1

const slice = createSlice({
  name: 'ui',
  initialState: { toasts: [] },
  reducers: {
    pushToast: {
      reducer(state, action) { state.toasts.push(action.payload) },
      prepare(message, type = 'success') { return { payload: { id: nextId++, message, type } } },
    },
    dismissToast(state, action) { state.toasts = state.toasts.filter((t) => t.id !== action.payload) },
  },
})

export const { pushToast, dismissToast } = slice.actions

export const toast = {
  success: (message) => pushToast(message, 'success'),
  error: (message) => pushToast(message, 'error'),
  info: (message) => pushToast(message, 'info'),
}

export default slice.reducer
