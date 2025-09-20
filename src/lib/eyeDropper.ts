/**
 * Provides a thin wrapper around the browser EyeDropper API so multiple callers
 * can share the same capability checks and cancellation handling.
 */

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperOpenOptions {
  signal?: AbortSignal;
}

interface EyeDropper {
  open: (options?: EyeDropperOpenOptions) => Promise<EyeDropperResult>;
}

interface EyeDropperConstructor {
  new (): EyeDropper;
}

interface EyeDropperWindow extends Window {
  EyeDropper?: EyeDropperConstructor;
}

/**
 * Determines whether the current runtime supports the EyeDropper API.
 */
export const isEyeDropperSupported = (): boolean =>
  typeof window !== 'undefined' && Boolean((window as EyeDropperWindow).EyeDropper);

/**
 * Opens the EyeDropper and resolves with the picked color.
 *
 * Returns `null` when the API is unsupported or the user cancels the picker.
 * Any other thrown errors are propagated to the caller so they can handle them.
 */
export const openEyeDropper = async ({
  signal,
}: EyeDropperOpenOptions = {}): Promise<string | null> => {
  if (!isEyeDropperSupported()) {
    return null;
  }

  try {
    const eyeDropper = new (window as EyeDropperWindow).EyeDropper!();
    const result = await eyeDropper.open(signal ? { signal } : undefined);
    return result.sRGBHex;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }
};
