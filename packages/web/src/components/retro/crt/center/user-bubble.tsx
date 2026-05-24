interface UserBubbleProps {
  text: string;
}

export const UserBubble = ({ text }: UserBubbleProps) => {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[4px] bg-zinc-100 px-[5px] py-[2px]">
        <span className="font-sans text-[6px] leading-[1.15] text-zinc-600">{text}</span>
      </div>
    </div>
  );
};
