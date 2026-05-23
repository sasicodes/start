import { Screen } from '../components/screen';

const homeParagraphs = [
  'Open a session when you need Start to inspect a bug, summarize a diff, or draft a focused change.',
  'Recent workspaces and active sessions will appear here when mobile sync is connected.',
  'Use New to start a thread. Settings keeps account, model, and workflow choices nearby.'
];

export default function HomeScreen() {
  return <Screen eyebrow="Home" paragraphs={homeParagraphs} title="Build from anywhere" />;
}
