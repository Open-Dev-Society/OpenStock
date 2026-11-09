import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kit } from '@/lib/kit';

describe('kit.sendBroadcast', () => {
    beforeEach(() => {
        vi.stubEnv('KIT_API_KEY', 'test-api-key');
        vi.stubEnv('KIT_API_SECRET', 'test-api-secret');
        vi.stubGlobal('fetch', vi.fn());
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it('rejects when Kit saves a broadcast as a draft', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ message: 'Broadcast was saved as a draft because your sender address is unconfirmed.' }),
        } as Response);

        await expect(kit.sendBroadcast('Weekly news', '<p>Summary</p>'))
            .rejects.toThrow('saved as a draft');
    });

    it('returns a confirmed Kit response unchanged', async () => {
        const result = { broadcast: { id: 42 } };
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => result,
        } as Response);

        await expect(kit.sendBroadcast('Weekly news', '<p>Summary</p>')).resolves.toEqual(result);
    });

    it('continues to reject unrelated Kit API failures', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            json: async () => ({ message: 'Invalid API key' }),
        } as Response);

        await expect(kit.sendBroadcast('Weekly news', '<p>Summary</p>'))
            .rejects.toThrow('Invalid API key');
    });
});
