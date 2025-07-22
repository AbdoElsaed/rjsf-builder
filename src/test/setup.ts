import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as never;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock DragEvent
global.DragEvent = class MockDragEvent extends Event {
  altKey: boolean = false;
  button: number = 0;
  buttons: number = 0;
  clientX: number = 0;
  clientY: number = 0;
  ctrlKey: boolean = false;
  metaKey: boolean = false;
  movementX: number = 0;
  movementY: number = 0;
  offsetX: number = 0;
  offsetY: number = 0;
  pageX: number = 0;
  pageY: number = 0;
  relatedTarget: EventTarget | null = null;
  screenX: number = 0;
  screenY: number = 0;
  shiftKey: boolean = false;
  x: number = 0;
  y: number = 0;

  constructor(type: string, eventInitDict?: DragEventInit) {
    super(type, eventInitDict);
  }

  dataTransfer = {
    dropEffect: 'none' as const,
    effectAllowed: 'all' as const,
    files: [] as File[],
    items: [] as DataTransferItem[],
    types: [] as string[],
    clearData: vi.fn(),
    getData: vi.fn().mockReturnValue(''),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  };

  getModifierState(): boolean {
    return false;
  }

  initMouseEvent(): void {}
} as never;
