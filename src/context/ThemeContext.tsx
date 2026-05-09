"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type ChatBackground = "default" | "neon" | "space" | "minimal";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  background: ChatBackground;
  setBackground: (b: ChatBackground) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
  background: "default",
  setBackground: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [background, setBackgroundState] = useState<ChatBackground>("default");

  useEffect(() => {
    // Load from localStorage on mount
    const savedTheme = localStorage.getItem("shark-theme") as Theme;
    const savedBg = localStorage.getItem("shark-bg") as ChatBackground;
    if (savedTheme) setThemeState(savedTheme);
    if (savedBg) setBackgroundState(savedBg);
  }, []);

  useEffect(() => {
    // Apply theme to document element
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("dark");
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("shark-theme", t);
  };

  const setBackground = (b: ChatBackground) => {
    setBackgroundState(b);
    localStorage.setItem("shark-bg", b);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, background, setBackground }}>
      {children}
    </ThemeContext.Provider>
  );
};
