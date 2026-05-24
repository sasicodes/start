interface KeyCapProps {
  span?: string;
  index: number;
}

export const KeyCap = ({ index, span = '' }: KeyCapProps) => {
  let animation: string | undefined;

  if (index % 5 === 0) animation = 'type-key 2.5s infinite 1.2s';
  else if ((index + 2) % 4 === 0) animation = 'type-key 1.2s infinite 0s';
  else if (index % 7 === 0) animation = 'type-key 2.1s infinite 0.5s';
  else if ((index + 1) % 3 === 0) animation = 'type-key 1.5s infinite 0.2s';
  else if (index % 2 === 0) animation = 'type-key 1.8s infinite 0.9s';

  return (
    <div
      className={`h-7 bg-retro-key rounded ${span}`}
      style={{
        boxShadow: '0 6px 0 var(--color-retro-stone), 0 8px 7px rgba(0,0,0,0.2)',
        transform: 'translateZ(1px)',
        animation
      }}
    />
  );
};
