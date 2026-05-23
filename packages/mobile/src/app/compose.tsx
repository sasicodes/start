import { Screen } from '../components/screen';

const composeParagraphs = [
  'Pick a workspace, describe the task, and keep the request tight. Start works best when the first message names the files, the goal, and the constraint.',
  'This shell reserves space for workspace and model controls before the composer connects to live sessions.'
];

const ComposeScreen = () => (
  <Screen eyebrow="New session" paragraphs={composeParagraphs} title="Start a focused thread" />
);

export default ComposeScreen;
