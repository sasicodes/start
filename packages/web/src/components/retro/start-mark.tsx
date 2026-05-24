interface StartMarkProps {
  className?: string;
}

export const StartMark = ({ className }: StartMarkProps) => {
  return (
    <svg role="img" viewBox="0 0 455 435" aria-label="Start" className={className}>
      <path
        d="M0 50C0 22.3858 22.3858 0 50 0H412.5C435.972 0 455 19.0279 455 42.5C455 65.9721 435.972 85 412.5 85H0V50Z"
        fill="#ff3f00"
      />
      <path d="M0 175H405C432.614 175 455 197.386 455 225V260H50C22.3858 260 0 237.614 0 210V175Z" fill="#ff3f00" />
      <path
        d="M0 392.5C0 369.028 19.0279 350 42.5 350H455V385C455 412.614 432.614 435 405 435H42.5C19.0279 435 0 415.972 0 392.5Z"
        fill="#ff3f00"
      />
    </svg>
  );
};
