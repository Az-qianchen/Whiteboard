/// <reference lib="webworker" />

import { adjustHsv, type HsvAdjustment } from '@/lib/image';

export interface BaseMessage {
  requestId: number;
}

export interface InitMessage extends BaseMessage {
  type: 'init';
  width: number;
  height: number;
  buffer: ArrayBuffer;
}

export interface AdjustMessage extends BaseMessage {
  type: 'adjust';
  adjustment: HsvAdjustment;
}

export interface ResetMessage extends BaseMessage {
  type: 'reset';
}

type IncomingMessage = InitMessage | AdjustMessage | ResetMessage;

type OutgoingMessage =
  | { type: 'init'; requestId: number }
  | { type: 'adjust'; requestId: number; width: number; height: number; buffer: ArrayBuffer }
  | { type: 'reset'; requestId: number }
  | { type: 'error'; requestId: number; error: string };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let baseImage: ImageData | null = null;

ctx.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init': {
        const data = new Uint8ClampedArray(message.buffer);
        baseImage = new ImageData(data, message.width, message.height);
        ctx.postMessage({ type: 'init', requestId: message.requestId } satisfies OutgoingMessage);
        break;
      }

      case 'adjust': {
        if (!baseImage) {
          ctx.postMessage({ type: 'error', requestId: message.requestId, error: 'not-initialized' } satisfies OutgoingMessage);
          break;
        }

        const result = adjustHsv(baseImage, message.adjustment ?? {});
        ctx.postMessage(
          {
            type: 'adjust',
            requestId: message.requestId,
            width: result.width,
            height: result.height,
            buffer: result.data.buffer,
          } satisfies OutgoingMessage,
          [result.data.buffer]
        );
        break;
      }

      case 'reset': {
        baseImage = null;
        ctx.postMessage({ type: 'reset', requestId: message.requestId } satisfies OutgoingMessage);
        break;
      }

      default:
        ctx.postMessage({ type: 'error', requestId: message.requestId, error: 'unknown-message' } satisfies OutgoingMessage);
    }
  } catch (error) {
    ctx.postMessage({ type: 'error', requestId: message.requestId, error: (error as Error).message } satisfies OutgoingMessage);
  }
};
