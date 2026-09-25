import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice'
import builder from './builderSlice'
import ui from './uiSlice'

export const store = configureStore({ reducer: { auth, builder, ui } })
