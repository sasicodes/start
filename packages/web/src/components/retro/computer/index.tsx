import { Keyboard } from '../keyboard';
import { Mouse } from '../mouse';
import { Box } from './box';
import { Front } from './front';
import { Sticky } from './sticky';

export const Computer = () => {
  return (
    <div className="relative p-16 -m-16" style={{ contain: 'layout style' }}>
      <div
        className="relative pointer-events-none [transform:rotateY(-15deg)_rotateX(5deg)] group-hover/section:[transform:rotateY(0deg)_rotateX(0deg)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      >
        <div className="relative w-[360px] h-[440px]" style={{ transformStyle: 'preserve-3d' }}>
          <Front />

          <Box className="bg-retro-stone" width={360} height={440} transform="translateZ(-100px) rotateY(180deg)" />

          <Box
            className="bg-retro-beige"
            width={200}
            height={440}
            transform="rotateY(-90deg) translateZ(100px)"
            shadow="inset 10px 0 20px rgba(0,0,0,0.05)"
          />

          <Box
            className="bg-retro-stone"
            width={200}
            height={440}
            transform="rotateY(90deg) translateZ(260px)"
            shadow="inset 10px 0 20px rgba(0,0,0,0.1)"
          />

          <Box className="bg-retro-shell" width={360} height={200} transform="rotateX(90deg) translateZ(100px)" />

          <Box
            className="bg-retro-base"
            width={360}
            height={200}
            transform="rotateX(-90deg) translateZ(340px)"
            shadow="0 50px 80px rgba(0,0,0,0.3)"
          />

          <Keyboard />
          <Mouse />
          <Sticky />
        </div>
      </div>
    </div>
  );
};
