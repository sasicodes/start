const MOUSE_W = 46;
const MOUSE_H = 68;
const MOUSE_D = 9;

export const Mouse = () => {
  return (
    <div
      className="absolute -bottom-[118px] left-[380px]"
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: 'top center',
        transform: 'translateZ(164px) rotateX(66deg)'
      }}
    >
      <div
        className="relative"
        style={{
          width: MOUSE_W,
          height: MOUSE_H,
          marginTop: (140 - MOUSE_H) / 2,
          transformStyle: 'preserve-3d'
        }}
      >
        <div
          className="absolute w-full h-full rounded-[3px] overflow-visible"
          style={{
            transform: `translateZ(${MOUSE_D}px)`,
            background: 'linear-gradient(180deg, var(--color-retro-shell) 0%, var(--color-retro-beige) 100%)',
            boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.08)'
          }}
        >
          <svg
            role="presentation"
            aria-hidden="true"
            className="absolute -top-[2px] left-1/2 w-[60px] h-[50px] overflow-visible"
            style={{ transform: 'translateX(-50%)' }}
          >
            <path
              d="M 30 2 C 30 -10, 20 -25, -30 -35"
              fill="none"
              stroke="#9a9588"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </svg>
          <div
            className="absolute top-[4px] left-[5px] right-[5px] rounded-[2px]"
            style={{
              height: MOUSE_H * 0.42,
              background: 'linear-gradient(180deg, #c5c1b4 0%, #b8b4a7 100%)',
              boxShadow:
                'inset 1px 1px 1px rgba(255,255,255,0.4), inset -1px -1px 2px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.08)'
            }}
          />
          <div
            className="absolute left-[5px] right-[5px] h-[1px] bg-neutral-400/30"
            style={{ top: MOUSE_H * 0.42 + 6 }}
          />
        </div>

        <div className="absolute w-full h-full rounded-[3px]" style={{ background: 'var(--color-retro-base)' }} />

        <div
          className="absolute left-0 w-full bottom-0"
          style={{
            height: MOUSE_D,
            transformOrigin: 'bottom center',
            transform: `translateZ(${MOUSE_D}px) rotateX(90deg)`,
            background: 'linear-gradient(180deg, #cdc9bb 0%, #b5b1a3 100%)'
          }}
        />

        <div
          className="absolute left-0 w-full top-0"
          style={{
            height: MOUSE_D,
            transformOrigin: 'top center',
            transform: `translateZ(${MOUSE_D}px) rotateX(-90deg)`,
            background: 'linear-gradient(180deg, #e0dcd0 0%, #cdc9bb 100%)'
          }}
        />

        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: MOUSE_D,
            transformOrigin: 'left center',
            transform: `translateZ(${MOUSE_D}px) rotateY(90deg)`,
            background: 'linear-gradient(180deg, #d5d1c4 0%, #bbb7aa 100%)'
          }}
        />

        <div
          className="absolute top-0 right-0 h-full"
          style={{
            width: MOUSE_D,
            transformOrigin: 'right center',
            transform: `translateZ(${MOUSE_D}px) rotateY(-90deg)`,
            background: 'linear-gradient(180deg, #c9c5b8 0%, #b0ac9f 100%)'
          }}
        />

        <div
          className="absolute w-full h-full top-0 left-0 pointer-events-none rounded-lg"
          style={{
            transformOrigin: 'top center',
            transform: 'rotateX(-156deg) translateZ(10px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 10px 16px rgba(0,0,0,0.15)'
          }}
        />
      </div>
    </div>
  );
};
