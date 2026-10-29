import { loadScript } from '@src/utils/loadScript';

describe(`${loadScript.name}: server`, () => {
  it('rejects without a document', async () => {
    await expect(
      loadScript({
        id: 'x',
        src: 'https://example.test/x.js',
        isReady: () => false,
      })
    ).rejects.toThrow('needs a document');
  });
});
