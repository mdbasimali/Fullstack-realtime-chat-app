import { create } from "zustand";


export const useThemeStore = create((set)=>({
    theme:localStorage.getItem("chat-theme") || "coffee",
    chatColor:localStorage.getItem("chat-color") || "auto",
    setTheme:(theme)=>{
        localStorage.setItem("chat-theme", theme);
        set({theme});
    },
    setChatColor:(chatColor)=>{
        localStorage.setItem("chat-color", chatColor);
        set({chatColor});
    },
}));