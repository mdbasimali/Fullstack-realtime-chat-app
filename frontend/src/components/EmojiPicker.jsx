import React, { useState, useEffect, useRef } from "react";
import { Search, Smile, Heart, Cat, Apple, Dribbble, Lightbulb, Delete } from "lucide-react";

const emojiCategories = [
  {
    name: "Smileys",
    icon: <Smile size={20} strokeWidth={1.5} />,
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕"]
  },
  {
    name: "People",
    icon: <Heart size={20} strokeWidth={1.5} />,
    emojis: ["👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🧠","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💖","💗","💓","💞","💕","💟","❣️","💋"]
  },
  {
    name: "Nature",
    icon: <Cat size={20} strokeWidth={1.5} />,
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦢","🦉","🦚","🦜","🐢","🐍","🦎","🐙","🦑","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🦤","🐇","🦨","🦡","🦥","🦦","🦫"]
  },
  {
    name: "Food",
    icon: <Apple size={20} strokeWidth={1.5} />,
    emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫓","🧅","🧄","🥔","🍠","🥐","🍞","🥖","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🍳","🥘","🍲","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🦪","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🍵","🧉","🍶","🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃"]
  },
  {
    name: "Activities",
    icon: <Dribbble size={20} strokeWidth={1.5} />,
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🎰","🎮","🕹️","🧸","♠️","♥️","♦️","♣️","🏓","🏸","🏆","🥇","🥈","🥉","🏅","🎖️","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","Violin"]
  },
  {
    name: "Objects",
    icon: <Lightbulb size={20} strokeWidth={1.5} />,
    emojis: ["💡","🕯️","🔦","🏮","🪔","🧱","🪙","💵","💴","💶","💷","💳","💎","🔧","🔨","🛠️","⛏️","🔩","⚙️","⛓️","🛡️","⚔️","🔑","🗝️","🚪","🪞","🪟","🛏️","🛋️","🪑","Shower","🚿","🛁","🪒","🧴","🧹","🧺","🧻","🧼","🧽","🧯","🛒","🚬","⚰️","🪦","🔮","🧿","📿","💈","🔑","🗝️","🔔","🔕"]
  }
];

const EmojiPicker = ({ onSelect, onClose, onDelete, isMobile }) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(emojiCategories[0].name);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const lastScrollTop = useRef(0);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore clicks on the toggle button
      if (event.target.closest(".emoji-toggle-btn")) return;
      
      // If the target is no longer in the document (e.g. removed by a re-render), do nothing.
      if (!document.contains(event.target)) return;

      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    // On mobile, also listen to touchstart so it fires earlier, preventing issues with synthesized mousedowns
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emoji) => {
    onSelect(emoji);
  };

  const handleScroll = (e) => {
    const currentScrollTop = e.target.scrollTop;
    if (currentScrollTop > lastScrollTop.current + 10) {
      // Scrolling down
      if (showBottomBar) setShowBottomBar(false);
    } else if (currentScrollTop < lastScrollTop.current - 10) {
      // Scrolling up
      if (!showBottomBar) setShowBottomBar(true);
    }
    lastScrollTop.current = currentScrollTop;
  };

  const getFilteredEmojis = () => {
    if (!search.trim()) {
      const category = emojiCategories.find((cat) => cat.name === activeCategory);
      return category ? category.emojis : [];
    }
    return emojiCategories
      .flatMap((cat) => cat.emojis)
      .slice(0, 100);
  };

  const allFiltered = search.trim()
    ? emojiCategories
        .flatMap((cat) => cat.emojis)
        .slice(0, 80)
    : getFilteredEmojis();

  return (
    <div
      ref={pickerRef}
      className={isMobile 
        ? "w-full h-[45vh] md:h-[50vh] bg-[#eff3f6] dark:bg-base-900 border-t border-base-300/60 flex flex-col overflow-hidden shadow-inner rounded-t-3xl" 
        : "absolute bottom-16 left-4 z-50 w-[340px] h-[400px] rounded-3xl bg-[#eff3f6]/95 dark:bg-base-950/95 backdrop-blur-xl border border-base-300/60 shadow-2xl flex flex-col overflow-hidden"
      }
    >
      {/* Category Tabs (Top) */}
      {!search.trim() && (
        <div className="flex justify-start gap-4 items-center px-4 pt-3 pb-1">
          {emojiCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              title={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`p-1 transition-all hover:scale-110 duration-200 active:scale-95 ${
                activeCategory === category.name
                  ? "text-primary opacity-100"
                  : "text-base-content/40 hover:text-base-content/60 opacity-70 hover:opacity-100"
              }`}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      {/* Search Bar (Below Tabs) */}
      <div className="px-3 py-2">
        <div className="relative flex items-center bg-base-200/60 dark:bg-base-900/60 rounded-[14px] px-3 py-1.5 border border-base-300/40 shadow-sm">
          <Search size={16} className="text-base-content/40 mr-2" />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[15px] text-base-content placeholder-base-content/40"
          />
        </div>
      </div>

      {/* Emoji Grid */}
      <div 
        className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-16 pt-1"
        onScroll={handleScroll}
      >
        {search.trim() && (
          <p className="text-[11px] text-base-content/50 mb-2 font-semibold uppercase tracking-wider pl-1">
            Search Results
          </p>
        )}
        <div className="grid grid-cols-7 sm:grid-cols-8 gap-x-1 gap-y-2 justify-items-center">
          {allFiltered.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-[28px] leading-none hover:scale-125 hover:brightness-110 transition-transform active:scale-90 duration-150 p-1.5 rounded-xl flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar (Telegram style - Floating) */}
      <div className={`absolute bottom-2 left-0 right-0 px-3 flex items-center justify-center pointer-events-none z-10 transition-all duration-300 ${showBottomBar ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"}`}>
        <div className={`flex bg-base-200/80 dark:bg-base-800/80 backdrop-blur-md rounded-full p-1 shadow-sm border border-base-300/30 ${showBottomBar ? "pointer-events-auto" : "pointer-events-none"}`}>
          <button className="px-4 py-1.5 rounded-full bg-base-100 dark:bg-base-700 shadow-sm text-[13px] font-bold text-base-content">Emoji</button>
          <button className="px-4 py-1.5 rounded-full text-base-content/50 hover:text-base-content text-[13px] font-semibold transition-colors">GIFs</button>
          <button className="px-4 py-1.5 rounded-full text-base-content/50 hover:text-base-content text-[13px] font-semibold transition-colors">Stickers</button>
        </div>

        <button 
          onClick={onDelete}
          className={`absolute right-4 p-2.5 text-base-content/60 hover:text-base-content bg-base-100/60 dark:bg-base-800/60 hover:bg-base-200/80 backdrop-blur-md rounded-full transition-colors cursor-pointer shadow-sm border border-base-300/30 ${showBottomBar ? "pointer-events-auto" : "pointer-events-none"}`}
          title="Backspace"
        >
          <Delete size={22} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};

export default EmojiPicker;
