import React, { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

const emojiCategories = [
  {
    name: "Smileys",
    icon: "😊",
    emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕"]
  },
  {
    name: "People & Hearts",
    icon: "❤️",
    emojis: ["👍","👎","👋","🤚","🖐️","✋","🖖","👌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🧠","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💖","💗","💓","💞","💕","💟","❣️","💋"]
  },
  {
    name: "Animals & Nature",
    icon: "🐱",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦢","🦉","🦚","🦜","🐢","🐍","🦎","🐙","🦑","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐩","🐈","🐓","🦃","🦤","🐇","🦨","🦡","🦥","🦦","🦫"]
  },
  {
    name: "Food & Drink",
    icon: "🍎",
    emojis: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫓","🧅","🧄","🥔","🍠","🥐","🍞","🥖","🥨","🥯","🥞","🧇","🧀","🍖","🍗","🥩","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🫔","🍳","🥘","🍲","🥣","🥗","🍿","🧈","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🦪","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🍵","🧉","🍶","🍾","🍷","🍸","🍹","🍺","🍻","🥂","🥃"]
  },
  {
    name: "Activities",
    icon: "⚽",
    emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🎰","🎮","🕹️","🧸","♠️","♥️","♦️","♣️","🏓","🏸","🏆","🥇","🥈","🥉","🏅","🎖️","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","Violin"]
  },
  {
    name: "Objects & Symbols",
    icon: "💡",
    emojis: ["💡","🕯️","🔦","🏮","🪔","🧱","🪙","💵","💴","💶","💷","💳","💎","🔧","🔨","🛠️","⛏️","🔩","⚙️","⛓️","🛡️","⚔️","🔑","🗝️","🚪","🪞","🪟","🛏️","🛋️","🪑","Shower","🚿","🛁","🪒","🧴","🧹","🧺","🧻","🧼","🧽","🧯","🛒","🚬","⚰️","🪦","🔮","🧿","📿","💈","🔑","🗝️","🔔","🔕"]
  }
];

const EmojiPicker = ({ onSelect, onClose, isMobile }) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(emojiCategories[0].name);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignore clicks on the toggle button
      if (event.target.closest(".emoji-toggle-btn")) return;
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleEmojiClick = (emoji) => {
    onSelect(emoji);
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
        ? "w-full h-[40vh] bg-base-100 dark:bg-base-900 border-t border-base-300/60 flex flex-col overflow-hidden" 
        : "absolute bottom-16 left-4 z-50 w-72 md:w-80 h-96 rounded-3xl bg-base-100/90 dark:bg-base-950/85 backdrop-blur-xl border border-base-300/60 shadow-2xl flex flex-col overflow-hidden"
      }
    >
      {/* Search Header */}
      <div className="p-3 pb-2 border-b border-base-300/40">
        <div className="relative flex items-center bg-base-200/50 dark:bg-base-900/40 rounded-full px-3 py-1.5 border border-base-300/20">
          <Search size={16} className="text-base-content/40 mr-2" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-xs md:text-sm text-base-content placeholder-base-content/40"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!search.trim() && (
        <div className="flex justify-around items-center bg-base-200/30 py-1.5 px-1 border-b border-base-300/30">
          {emojiCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              title={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`p-1.5 rounded-lg text-lg transition-all hover:scale-110 duration-200 active:scale-95 ${
                activeCategory === category.name
                  ? "bg-primary/10 text-primary scale-110 shadow-xs"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              {category.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {search.trim() && (
          <p className="text-[10px] text-base-content/50 mb-2 font-semibold">
            Common emojis
          </p>
        )}
        <div className="grid grid-cols-7 gap-2.5 justify-items-center">
          {allFiltered.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 hover:brightness-110 transition-transform active:scale-90 duration-150 p-1 rounded-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmojiPicker;
