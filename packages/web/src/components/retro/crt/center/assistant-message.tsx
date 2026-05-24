interface AssistantMessageProps {
  text: string;
}

export const AssistantMessage = ({ text }: AssistantMessageProps) => {
  return (
    <div>
      <span className="block font-sans text-[6px] leading-[1.4] text-zinc-700 whitespace-pre-line">
        {text.length > 200 ? `${text.slice(0, 200)}...` : text}
      </span>
    </div>
  );
};
