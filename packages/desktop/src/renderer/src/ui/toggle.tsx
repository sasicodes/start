import { Switch } from '@base-ui/react/switch';

interface ToggleProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export const Toggle = ({ label, checked, onChange, disabled = false }: ToggleProps) => (
  <Switch.Root
    checked={checked}
    disabled={disabled}
    aria-label={label}
    onCheckedChange={onChange}
    className="inline-flex h-5 w-9 flex-none items-center rounded-full bg-control p-0.5 outline-0 transition-colors duration-150 ease-out data-[checked]:bg-progress disabled:opacity-55"
  >
    <Switch.Thumb className="size-4 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-[checked]:translate-x-4" />
  </Switch.Root>
);
