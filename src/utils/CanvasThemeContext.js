import { createContext, useContext } from 'react';

export const CanvasThemeContext = createContext(null);

export const useCanvasTheme = (fallbackTheme = 'dark') => useContext(CanvasThemeContext) || fallbackTheme;
