import { BrowserIcon, ComposeIcon, GoalFilledIcon } from '@renderer/ui/icons';
import { type MentionName, parseUserMentions } from '../../../../shared/mentions/utils.js';

interface UserTextProps {
  text: string;
}

interface MentionIconProps {
  name: MentionName;
}

const labels = { goal: 'Goal', browser: 'Browser', 'new-session': 'New Session' };

const MentionIcon = ({ name }: MentionIconProps) => {
  if (name === 'goal') return <GoalFilledIcon />;
  if (name === 'browser') return <BrowserIcon />;
  return <ComposeIcon />;
};

export const UserText = ({ text }: UserTextProps) => (
  <>
    {parseUserMentions(text).map((part) =>
      part.kind === 'text' ? (
        part.text
      ) : (
        <span key={part.start} class="relative whitespace-nowrap pl-5 font-medium text-brand-accent">
          <span class="absolute top-1/2 left-0 size-4 -translate-y-1/2 [&_svg]:size-full">
            <MentionIcon name={part.name} />
          </span>
          {labels[part.name]}
        </span>
      )
    )}
  </>
);
