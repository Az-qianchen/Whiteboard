// IndexedDB 存储测试
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 简易 IndexedDB 模拟实现
class FakeRequest<T = any> {
  result?: T;
  error: any;
  onsuccess: ((this: FakeRequest<T>, ev: Event) => any) | null = null;
  onerror: ((this: FakeRequest<T>, ev: Event) => any) | null = null;
}

class FakeOpenRequest<T = any> extends FakeRequest<T> {
  onupgradeneeded: ((this: FakeOpenRequest<T>, ev: Event) => any) | null = null;
}

function succeed<T>(req: FakeRequest<T>, result?: T) {
  queueMicrotask(() => {
    req.result = result;
    req.onsuccess?.(new Event('success'));
  });
}

function fail(req: FakeRequest, error: any) {
  queueMicrotask(() => {
    req.error = error;
    req.onerror?.(new Event('error'));
  });
}

class FakeStore {
  private data = new Map<IDBValidKey, any>();

  get(key: IDBValidKey) {
    const req = new FakeRequest<any>();
    succeed(req, this.data.get(key));
    return req as unknown as IDBRequest;
  }

  put(value: any, key: IDBValidKey) {
    const req = new FakeRequest<void>();
    this.data.set(key, value);
    succeed(req);
    return req as unknown as IDBRequest;
  }

  delete(key: IDBValidKey) {
    const req = new FakeRequest<void>();
    this.data.delete(key);
    succeed(req);
    return req as unknown as IDBRequest;
  }
}

class FakeDB {
  private store = new FakeStore();

  createObjectStore(_name: string) {
    return this.store;
  }

  transaction(_name: string, _mode: IDBTransactionMode) {
    return {
      objectStore: () => this.store
    } as unknown as IDBTransaction;
  }
}

globalThis.indexedDB = {
  open() {
    const req = new FakeOpenRequest<IDBDatabase>();
    queueMicrotask(() => {
      const db = new FakeDB() as unknown as IDBDatabase;
      req.result = db;
      req.onupgradeneeded?.(new Event('upgradeneeded'));
      req.onsuccess?.(new Event('success'));
    });
    return req as unknown as IDBOpenDBRequest;
  },
  deleteDatabase() {
    const req = new FakeRequest<void>();
    succeed(req);
    return req as unknown as IDBRequest;
  }
} as any;

// IndexedDB 存储测试
describe('IndexedDB 存储测试', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  // 正常写入数据
  it('set 成功写入数据', async () => {
    const { set, get } = await import('@/lib/indexedDB');
    await set('foo', 'bar');
    expect(await get('foo')).toBe('bar');
  });

  // 写入时发生错误
  it('set 写入失败抛出异常', async () => {
    const { set } = await import('@/lib/indexedDB');
    vi.spyOn(FakeStore.prototype, 'put').mockImplementation(() => {
      const req = new FakeRequest<void>();
      fail(req, new Error('put error'));
      return req as unknown as IDBRequest;
    });
    await expect(set('foo', 'bar')).rejects.toThrow('put error');
  });

  // 正常读取数据
  it('get 成功读取数据', async () => {
    const { set, get } = await import('@/lib/indexedDB');
    await set('foo', 'bar');
    expect(await get('foo')).toBe('bar');
  });

  // 读取时发生错误
  it('get 读取失败抛出异常', async () => {
    const { get } = await import('@/lib/indexedDB');
    vi.spyOn(FakeStore.prototype, 'get').mockImplementation(() => {
      const req = new FakeRequest<void>();
      fail(req, new Error('get error'));
      return req as unknown as IDBRequest;
    });
    await expect(get('foo')).rejects.toThrow('get error');
  });

  // 正常删除数据
  it('del 成功删除数据', async () => {
    const { set, del, get } = await import('@/lib/indexedDB');
    await set('foo', 'bar');
    await del('foo');
    expect(await get('foo')).toBeUndefined();
  });

  // 删除时发生错误
  it('del 删除失败抛出异常', async () => {
    const { del } = await import('@/lib/indexedDB');
    vi.spyOn(FakeStore.prototype, 'delete').mockImplementation(() => {
      const req = new FakeRequest<void>();
      fail(req, new Error('del error'));
      return req as unknown as IDBRequest;
    });
    await expect(del('foo')).rejects.toThrow('del error');
  });
});
