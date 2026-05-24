import { KeyboardEdge } from './edge';
import { KeyGrid } from './grid';
import { KeyboardSide } from './side';

export const RetroKeyboard = () => {
  return (
    <div
      className="absolute w-[360px] h-[140px] -bottom-[118px]"
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: 'top center',
        transform: 'translateZ(164px) rotateX(66deg)'
      }}
    >
      <div
        className="absolute w-full h-full bg-retro-beige overflow-hidden"
        style={{
          transform: 'translateZ(9px)',
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.5), inset -5px -5px 15px rgba(0,0,0,0.1)'
        }}
      >
        <KeyGrid />
      </div>

      <KeyboardEdge
        position="bottom"
        gradient="linear-gradient(180deg, #cdc9bb 0%, #b5b1a3 100%)"
        transform="translateZ(9px) rotateX(90deg)"
        origin="bottom center"
      />

      <KeyboardEdge
        position="top"
        gradient="linear-gradient(180deg, #e5e1d4 0%, #c9c5b8 100%)"
        transform="translateZ(9px) rotateX(-90deg)"
        origin="top center"
      />

      <KeyboardSide
        side="left"
        gradient="linear-gradient(180deg, #d1cdbf 0%, #b7b3a6 100%)"
        transform="translateZ(9px) rotateY(90deg)"
        origin="left center"
      />

      <KeyboardSide
        side="right"
        gradient="linear-gradient(180deg, #d1cdbf 0%, #b7b3a6 100%)"
        transform="translateZ(9px) rotateY(-90deg)"
        origin="right center"
      />

      <div
        className="absolute w-full h-full top-0 left-0 pointer-events-none rounded-xl"
        style={{
          transformOrigin: 'top center',
          transform: 'rotateX(-156deg) translateZ(20px)',
          boxShadow: '0 40px 70px rgba(0,0,0,0.25), 0 20px 30px rgba(0,0,0,0.15)'
        }}
      />
    </div>
  );
};
