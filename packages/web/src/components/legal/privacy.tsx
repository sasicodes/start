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
          updated="July 8, 2026"
          subtitle="Start is your coding assistant. Your project data stays under your control."
        />
        <div className="mt-12 flex flex-col gap-10 pb-20 sm:mt-16">
          <Section title="What we collect">
            <p>
              We do not collect your code, prompts, chat messages, file contents, file paths, diffs, environment
              variables, project names, or AI responses.
            </p>
            <p>
              Start may send limited product usage signals to help us understand reliability, performance, and how the
              app is used.
            </p>
            <p>
              These signals are associated with a random installation id. They never include your name, account
              identity, or any personal detail, and session or workspace identifiers are one-way salted hashes.
            </p>
          </Section>

          <Section title="Where your data lives">
            <p>
              Project data, conversations, settings, and generated changes are stored by the app on your own device or
              in the services you explicitly configure.
            </p>
            <p>No server-side copy of your project data or conversations exists.</p>
          </Section>

          <Section title="Provider keys">
            <p>
              Start uses the provider keys you configure to contact the AI services you choose. We do not receive,
              manage, or proxy those keys.
            </p>
            <p>If you rotate or revoke a key with a provider, update the corresponding configuration in Start.</p>
          </Section>

          <Section title="What leaves your device">
            <p>
              When you send a prompt, it goes from your device to the AI provider you configured. The provider handles
              that data under its own policies.
            </p>
            <p>
              The same applies to other services you connect, such as a Git host. Requests go from your device to the
              service directly.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p>
              To remove locally stored data, quit Start, then delete its local application data and remove any provider
              keys you configured.
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
