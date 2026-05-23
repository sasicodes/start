import { Screen } from '../components/screen';

const settingsParagraphs = [
  'Manage account, model defaults, notifications, and workspace access from one place.',
  'Keep mobile choices quiet by default. Start should only interrupt when a session needs your decision.'
];

export default function SettingsScreen() {
  return <Screen eyebrow="Settings" paragraphs={settingsParagraphs} title="Tune Start for your workflow" />;
}
