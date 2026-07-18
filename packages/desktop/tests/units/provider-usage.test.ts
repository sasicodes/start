import { ProviderUsageService } from '@main/usage/index';
import { fetchProviderUsage, parseProviderUsage } from '@main/usage/providers';

vi.mock('@main/utils/logger', () => ({ logger: { error: vi.fn() } }));

const openAiResponse = () =>
  new Response(
    JSON.stringify({
      rate_limit: {
        primary_window: { reset_at: 2_000_000_000, used_percent: 48 }
      }
    }),
    { status: 200 }
  );

describe('provider usage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the most constrained OpenAI window and its provider reset', () => {
    expect(
      parseProviderUsage('openai', {
        rate_limit: {
          primary_window: {
            used_percent: 42,
            reset_at: 2_000_000_000
          },
          secondary_window: {
            used_percent: 81,
            reset_at: 2_000_086_400
          }
        }
      })
    ).toEqual({
      id: 'openai',
      remainingPercent: 19,
      resetAt: 2_000_086_400_000
    });
  });

  it('uses the most constrained Anthropic window and parses its reset', () => {
    expect(
      parseProviderUsage('anthropic', {
        five_hour: { resets_at: '2033-05-18T03:33:20.000Z', utilization: 62 },
        seven_day: { resets_at: '2033-05-19T03:33:20.000Z', utilization: 24 }
      })
    ).toEqual({
      id: 'anthropic',
      remainingPercent: 38,
      resetAt: 2_000_000_000_000
    });
  });

  it('rejects an invalid provider response', () => {
    expect(() => parseProviderUsage('openai', { rate_limit: {} })).toThrow(
      'OpenAI did not return a supported usage window.'
    );
  });

  it('sends the OpenAI OAuth account header without exposing refresh credentials', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => openAiResponse());
    vi.stubGlobal('fetch', fetchMock);

    await fetchProviderUsage('openai', { accountId: 'account-1', token: 'access-token' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://chatgpt.com/backend-api/wham/usage',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer access-token',
          'ChatGPT-Account-Id': 'account-1'
        }
      })
    );
  });

  it('skips fresh requests and unchanged menu updates', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => openAiResponse());
    const onChange = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const service = new ProviderUsageService({
      onChange,
      prepareCredentials: () => {},
      getCredential: async (provider) =>
        provider === 'openai' ? { accountId: 'account-1', token: 'access-token' } : null
    });

    await service.refresh();
    await service.refresh();
    await service.refreshIfStale();

    expect(service.getUsage()).toEqual([
      {
        id: 'openai',
        remainingPercent: 52,
        resetAt: 2_000_000_000_000
      }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('clears stale usage after a refresh failure', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => openAiResponse())
      .mockRejectedValueOnce(new Error('network unavailable'));
    const onChange = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const service = new ProviderUsageService({
      onChange,
      prepareCredentials: () => {},
      getCredential: async (provider) =>
        provider === 'openai' ? { accountId: 'account-1', token: 'access-token' } : null
    });

    await service.refresh();
    await service.refresh();

    expect(service.getUsage()).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
