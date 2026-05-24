import { Screen } from '../crt/screen';
import { Badge } from './badge';
import { Floppy } from './floppy';
import { AnnotationMarkers } from './markers';
import { Stickies } from './stickies';
import { Vents } from './vents';

export const Front = () => {
  return (
    <div
      className="absolute w-[360px] h-[440px] flex flex-col items-center pt-10"
      style={{
        transform: 'translateZ(100px)',
        background: 'linear-gradient(135deg, var(--color-retro-shell) 0%, var(--color-retro-beige) 100%)',
        boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.8), inset -5px -5px 15px rgba(0,0,0,0.1)'
      }}
    >
      <Screen />
      <Floppy />
      <Badge />
      <Stickies />
      <Vents />
      <AnnotationMarkers />
    </div>
  );
};
