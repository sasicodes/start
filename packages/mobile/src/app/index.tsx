import { Screen } from '../components/screen';

const homeParagraphs = [
  'Start is your coding agent for planning, editing, and reviewing real projects. This home screen has enough content to make the native tab bar work for its living, so you can scroll text underneath the glass and judge whether the controls are truly transparent.',
  'The bottom controls should feel like iOS controls, not a custom overlay. The Home and Settings items are rendered by Expo Router native tabs, and the new session action uses the iOS Liquid Glass effect when it is available.',
  'Scroll slowly until this text sits directly behind the tab bar. The glass should refract the content rather than covering it with a painted background. If the system reduces transparency, the fallback stays minimal and does not add a fake solid shell.',
  'A real first run will eventually show recent workspaces, active sessions, model status, and quick prompts. For now this copy acts as a test pattern with varied line lengths so opacity, blur, and scroll-edge behavior are easier to see.',
  'Ask Start to inspect a bug, summarize a diff, write a small component, or explain a failing test. The mobile surface should feel light, direct, and native, with the important action always within thumb reach.',
  'The tab bar should not stretch across the whole screen as a colored strip. It should keep the native liquid layout, respect system appearance, and let the page continue visually underneath it.',
  'The plus action should read as a floating command, not as a third equal tab. It opens a new session and keeps the primary workflow separate from navigation.',
  'On a long project day, this screen needs to stay calm. Text remains readable, controls stay compact, and the interface avoids extra decoration that would fight the native materials.',
  'Dark mode should preserve the same structure. The content becomes softer, the controls remain native, and the glass should still reveal enough motion underneath to prove that it is not a static panel.',
  'This final paragraph is intentionally near the bottom inset. It lets you test the last bit of scroll travel, the safe area, and whether the tab controls float above content without hiding important text.'
];

export default function HomeScreen() {
  return <Screen eyebrow="Home" paragraphs={homeParagraphs} title="Build from anywhere" />;
}
