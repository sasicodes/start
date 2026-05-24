import { INNER_RAIL } from '@/constants';
import { Footer } from '@/footer';
import { Header } from './header';
import { Section } from './section';

export const Privacy = () => {
  return (
    <div className="relative min-h-dvh w-full bg-retro-cream font-sans">
      <div style={{ maxWidth: `${INNER_RAIL}px` }} className="mx-auto px-6 pt-12 pb-0 sm:px-10 sm:pt-20">
        <Header
          title="Privacy"
          updated="May 24, 2026"
          subtitle="Start is your coding assistant. It runs locally on your Mac, and your project data stays on your machine."
        />
        <div className="mt-12 flex flex-col gap-10 pb-20 sm:mt-16">
          <Section title="What we collect">
            <p>
              We do not collect your code, prompts, chat messages, file contents, file paths, diffs, environment
              variables, project names, task names, or AI responses.
            </p>
            <p>Start does not include tracking pixels, advertising identifiers, or third-party telemetry in the app.</p>
          </Section>

          <Section title="Where your data lives">
            <p>
              Application data is stored locally on your Mac. Projects, chat history, tasks, preferences, indexes, and
              logs live in Start's local data directory on your device.
            </p>
            <p>No server-side copy exists. There is nothing for us to synchronize and nothing for us to disclose.</p>
          </Section>

          <Section title="API keys and access tokens">
            <p>
              <strong className="font-semibold text-zinc-900">
                API keys and access tokens are stored securely in the macOS Keychain.
              </strong>{' '}
              They are never transmitted to our servers and we cannot read them. Start uses the tokens on your machine
              only when it needs to call an AI provider or a connected service.
            </p>
            <p>
              If you rotate or revoke a key with the provider, Start will be unable to use it until the corresponding
              Keychain entry is updated.
            </p>
          </Section>

          <Section title="What leaves your machine">
            <p>
              When you send a prompt, it goes directly from your Mac to the AI provider you configured, using your own
              credentials. The provider handles that data under its own policies.
            </p>
            <p>
              The same applies to other services you connect, such as a Git host. Requests go from your machine to the
              service directly.
            </p>
            <p>Start may check for new versions so you can download updates.</p>
          </Section>

          <Section title="Diagnostics and crash logs">
            <p>
              Start does not transmit crash reports or diagnostic logs to us. If you choose to report an issue, you may
              copy relevant logs from your machine and send them to us directly.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p>
              To remove locally stored data, quit Start, then delete its data directory and any entries it created in
              your Keychain. Uninstalling the application by itself does not clear your data.
            </p>
          </Section>

          <Section title="Contact">
            <p>For questions about this policy, contact us at start [at] intelligence [dot] one.</p>
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  );
};
