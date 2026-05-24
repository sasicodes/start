type StickyTone = 'blue' | 'green' | 'pink' | 'yellow';

interface StickyNote {
  text: string;
  done?: boolean;
  tone: StickyTone;
  rotate: number;
}

const NOTES: StickyNote[] = [
  {
    text: 'Ship v1.0',
    tone: 'yellow',
    rotate: 6
  },
  {
    text: 'Fix auth bug',
    done: true,
    tone: 'pink',
    rotate: -4
  },
  {
    text: 'Write tests',
    tone: 'blue',
    rotate: 3
  },
  {
    text: 'Review PR #42',
    tone: 'green',
    rotate: -7
  }
];

export const Stickies = () => {
  return (
    <>
      {NOTES.map((note) => (
        <div
          key={note.text}
          style={{
            transform: `translateZ(101px) rotate(${note.rotate}deg)`
          }}
          className={`absolute z-20 flex items-center justify-center border p-2 text-center font-cursive leading-tight shadow-[2px_2px_5px_rgba(0,0,0,0.15)] ${
            note.tone === 'yellow'
              ? 'bottom-[105px] -right-[18px] h-[76px] w-[76px] border-yellow-300/50 bg-yellow-200'
              : note.tone === 'pink'
                ? 'bottom-[70px] left-[12px] h-[64px] w-[72px] border-pink-300/50 bg-pink-200'
                : note.tone === 'blue'
                  ? 'bottom-[100px] left-[55px] h-[60px] w-[68px] border-blue-200/50 bg-blue-100'
                  : 'right-[40px] bottom-[88px] h-[62px] w-[74px] border-green-200/50 bg-green-100'
          }`}
        >
          <span className={`text-[9px] text-gray-800 ${note.done ? 'line-through opacity-60' : ''}`}>{note.text}</span>
        </div>
      ))}
    </>
  );
};
