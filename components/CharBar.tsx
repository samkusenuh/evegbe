"use client";

import { useState } from "react";

const SPECIAL = [
  { lower: "ɖ", upper: "Ɖ" },
  { lower: "ɛ", upper: "Ɛ" },
  { lower: "ƒ", upper: "Ƒ" },
  { lower: "ɣ", upper: "Ɣ" },
  { lower: "ŋ", upper: "Ŋ" },
  { lower: "ɔ", upper: "Ɔ" },
  { lower: "ʋ", upper: "Ʋ" },
];

const TONES = [
  "á", "à", "ǎ", "â",
  "é", "è", "ě", "ê",
  "í", "ì", "ǐ", "î",
  "ó", "ò", "ǒ", "ô",
  "ú", "ù", "ǔ", "û",
  "ɛ́", "ɛ̀", "ɛ̌", "ɛ̂",
  "ɔ́", "ɔ̀", "ɔ̌", "ɔ̂",
];

const NASALS = ["ã", "ẽ", "ĩ", "õ", "ũ", "ɛ̃", "ɔ̃"];

export default function CharBar({ onInsert }: { onInsert: (c: string) => void }) {
  const [shift, setShift] = useState(false);
  const [showTones, setShowTones] = useState(false);

  const insert = (c: string) => {
    onInsert(c);
    if (shift) setShift(false);
  };

  const btn = (active = false) =>
    `flex-shrink-0 min-w-[40px] h-11 px-2.5 flex items-center justify-center rounded-lg border font-serif text-xl transition ${
      active
        ? "bg-ink text-parchment border-ink"
        : "bg-parchelev text-ink border-line hover:bg-parchsunken"
    }`;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShift(!shift)}
          className={btn(shift) + " text-sm font-sans font-semibold"}
          aria-label="Uppercase"
        >
          ⇧
        </button>
        {SPECIAL.map(({ lower, upper }) => {
          const c = shift ? upper : lower;
          return (
            <button
              key={lower}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insert(c)}
              className={btn()}
            >
              {c}
            </button>
          );
        })}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowTones(!showTones)}
          className={btn(showTones) + " text-sm font-sans font-semibold"}
          aria-label="Tones & nasals"
        >
          ◌́
        </button>
      </div>

      {showTones && (
        <div className="bg-parchsunken rounded-lg p-2 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {TONES.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(c)}
                className="h-10 flex items-center justify-center rounded-md border border-line bg-parchelev font-serif text-lg hover:bg-parchment transition"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="h-px bg-line opacity-60" />
          <div className="grid grid-cols-7 gap-1.5">
            {NASALS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insert(c)}
                className="h-10 flex items-center justify-center rounded-md border border-line bg-parchelev font-serif text-base hover:bg-parchment transition"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
