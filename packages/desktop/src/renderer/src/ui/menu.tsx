import { Menu } from '@base-ui/react/menu';
import { cn } from '@renderer/utils/cn';
import type { ComponentChildren } from 'preact';

export type MenuPanelWidth = 'provider' | 'model' | 'workspaceBubble';

type MenuPanelProps = {
  children: ComponentChildren;
  width: MenuPanelWidth;
};

export const AppMenu = Menu;

export const MenuPanel = ({ children, width }: MenuPanelProps) => {
  return (
    <Menu.Popup
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      className={cn(
        'origin-bottom rounded-2xl bg-panel p-1 shadow-panel outline-0 transition-[opacity,transform] duration-100 ease-out data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0',
        width === 'provider' && 'w-44',
        width === 'model' && 'w-56',
        width === 'workspaceBubble' && 'w-72'
      )}
    >
      {children}
    </Menu.Popup>
  );
};

export const MenuSubmenuTrigger = ({ children }: { children: ComponentChildren }) => {
  return (
    <Menu.SubmenuTrigger className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control data-[popup-open]:bg-control">
      {children}
    </Menu.SubmenuTrigger>
  );
};

export const MenuRadioOption = ({
  label,
  value,
  children,
  onSelect
}: {
  label: string;
  value: string;
  children: ComponentChildren;
  onSelect?: () => void;
}) => {
  return (
    <Menu.RadioItem
      key={value}
      label={label}
      value={value}
      closeOnClick
      onClick={onSelect}
      onPointerUp={onSelect}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm leading-5 font-medium text-ink outline-0 select-none data-[highlighted]:bg-control"
    >
      {children}
    </Menu.RadioItem>
  );
};

export const MenuEmptyItem = ({ children }: { children: ComponentChildren }) => {
  return (
    <Menu.Item className="px-3 py-2 text-sm leading-5 text-soft" disabled>
      {children}
    </Menu.Item>
  );
};
