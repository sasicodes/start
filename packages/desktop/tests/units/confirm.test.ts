import { confirmClose } from '@main/confirm';
import { setWorkInProgressSource } from '@main/wip';
import { beforeEach, describe, expect, it } from 'vitest';
import { dialog, resetDialog, setDialogResponse } from '../fakes/electron.js';

describe('confirmClose', () => {
  beforeEach(() => {
    resetDialog();
    setWorkInProgressSource(() => true);
  });

  it('skips the dialog and confirms when no work is in progress', async () => {
    setWorkInProgressSource(() => false);

    await expect(confirmClose()).resolves.toBe(true);
    expect(dialog.calls).toHaveLength(0);
  });

  it('returns false when the dialog is canceled', async () => {
    setDialogResponse(0);

    await expect(confirmClose()).resolves.toBe(false);
  });

  it('returns true when the dialog is accepted', async () => {
    setDialogResponse(1);

    await expect(confirmClose()).resolves.toBe(true);
  });

  it('uses the quit confirmation message', async () => {
    await confirmClose();

    expect(dialog.calls[0]?.[0]).toMatchObject({
      type: 'warning',
      message: 'Quit Start?'
    });
  });
});
