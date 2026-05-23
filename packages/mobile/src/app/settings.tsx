import { Screen } from '../components/screen';

const settingsParagraphs = [
  'Manage account, model defaults, notifications, and workspace access from one place.',
  'Keep mobile choices quiet by default. Start should only interrupt when a session needs your decision.'
];

const SettingsScreen = () => (
  <Screen eyebrow="Settings" paragraphs={settingsParagraphs} title="Tune Start for your workflow" />
);

export default SettingsScreen;
