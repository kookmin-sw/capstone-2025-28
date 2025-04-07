import { create } from "zustand";

const isClient = typeof window !== "undefined";

export const useResponsiveStore = create((set) => ({
  isMobile: isClient ? window.innerWidth < 768 : false,
  screenWidth: isClient ? window.innerWidth : 0,
  screenHeight: isClient ? window.innerHeight : 0,

  updateDimensions: () => {
    if (typeof window !== "undefined") {
      set({
        isMobile: window.innerWidth < 768,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
      });
    }
  },
}));
