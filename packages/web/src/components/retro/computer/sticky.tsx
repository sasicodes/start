const getTamilGreeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'காலை வணக்கம்' : 'மாலை வணக்கம்';
};

export const Sticky = () => {
  return (
    <div
      className="absolute -bottom-[108px] left-[20px]"
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: 'top center',
        transform: 'translateZ(164px) rotateX(60deg)'
      }}
    >
      <div
        style={{ transform: 'translateZ(1px) rotate(-8deg)' }}
        className="w-[80px] h-[70px] bg-orange-200 p-2 flex items-center justify-center text-center leading-tight border border-orange-300/50 font-cursive shadow-[2px_2px_5px_rgba(0,0,0,0.15)]"
      >
        <span className="text-gray-800 text-[9px]">{getTamilGreeting()}</span>
      </div>
    </div>
  );
};
