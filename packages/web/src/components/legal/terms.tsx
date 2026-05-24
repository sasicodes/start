import { INNER_RAIL } from '@/constants';
import { Footer } from '@/footer';
import { Header } from './header';
import { Section } from './section';

export const Terms = () => {
  return (
    <div className="relative min-h-dvh w-full bg-retro-cream font-sans">
      <div style={{ maxWidth: `${INNER_RAIL}px` }} className="mx-auto px-6 pt-12 pb-0 sm:px-10 sm:pt-20">
        <Header
          title="Terms"
          updated="May 24, 2026"
          subtitle="These terms govern your use of Start, your coding assistant."
        />
        <div className="mt-12 flex flex-col gap-10 pb-20 sm:mt-16">
          <Section title="Provided as-is">
            <p>
              Start is provided on an as-is basis, without warranties of any kind, express or implied. We build it with
              care, but we do not guarantee that it is free of defects or suitable for every workflow.
            </p>
          </Section>

          <Section title="Your keys, your usage">
            <p>
              Start operates with the provider keys and access tokens you configure. You own them, and you are
              responsible for any usage or costs incurred with the providers you choose.
            </p>
            <p>We do not see, manage, or proxy your provider keys.</p>
          </Section>

          <Section title="AI output">
            <p>
              Start connects to third-party AI models. It sends your prompts to the provider you configure and may run
              commands the model asks for on your machine.
            </p>
            <p>
              Outputs may be incorrect, incomplete, or unexpected. Review changes before committing them, and treat any
              generated command with the same caution you would apply to a script you did not write yourself.
            </p>
          </Section>

          <Section title="Your responsibility">
            <p>
              You are responsible for the code the model produces, the commands it runs, and any effects on your system,
              repositories, or third-party services. Use version control and keep backups.
            </p>
          </Section>

          <Section title="Third-party services">
            <p>
              When Start connects to services such as an AI provider or Git host, your use of those services is governed
              by their terms. Start acts as a client, and any limits, fees, or rate caps apply to your relationship with
              those services directly.
            </p>
          </Section>

          <Section title="Open source">
            <p>
              Start is built on open-source libraries. Their licenses apply to their respective components, and we
              acknowledge the contributions of their maintainers.
            </p>
          </Section>

          <Section title="Limitation of liability">
            <p>
              To the extent permitted by applicable law, Start and its maintainers are not liable for lost work, lost
              data, provider charges, or any other damages arising from your use of the application or from actions
              performed by a model running within it.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              These terms may be updated as the application evolves. Updated terms take effect when published on this
              page.
            </p>
          </Section>

          <Section title="Contact">
            <p>For questions regarding these terms, contact us at start [at] intelligence [dot] one.</p>
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  );
};
