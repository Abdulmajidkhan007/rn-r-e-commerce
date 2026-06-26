import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SupportedLanguage } from '@kidswear/i18n';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UiState {
  theme: ThemePreference;
  language: SupportedLanguage;
}

const initialState: UiState = {
  theme: 'system',
  language: 'uz',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setLanguage(state, action: PayloadAction<SupportedLanguage>) {
      state.language = action.payload;
    },
  },
});

export const { setTheme, toggleTheme, setLanguage } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
