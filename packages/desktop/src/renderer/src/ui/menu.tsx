import { Menu } from '@base-ui/react/menu';
import { tw } from '@renderer/utils/tw';
import type { ComponentChildren } from 'preact';

interface MenuPanelProps {
  className?: string;
  children: ComponentChildren;
}

export const AppMenu = Menu;

export const MenuPanel = ({ className, children }: MenuPanelProps) => {
  return (
    <Menu.Popup
      onMouseDown={(event: MouseEvent) => event.stopPropagation()}
      className={tw(
        'rounded-2xl bg-panel p-1 shadow-panel outline-0 transition-[opacity,transform] duration-75 ease-out data-[ending-style]:translate-y-1 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-1 data-[starting-style]:opacity-0',
        className
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
  onSelect?: () => void;
  children: ComponentChildren;
}) => {
  return (
    <Menu.RadioItem
      key={value}
      closeOnClick
      label={label}
      value={value}
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
    <Menu.Item disabled className="px-3 py-2 text-sm leading-5 text-soft">
      {children}
    </Menu.Item>
  );
};
