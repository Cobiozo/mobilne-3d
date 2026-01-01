/**
 * Conditional logging utility for development mode only
 * In production, these functions do nothing to improve performance
 */

const isDev = import.meta.env.DEV;

export const devLog = (...args: unknown[]): void => {
  if (isDev) console.log(...args);
};

export const devWarn = (...args: unknown[]): void => {
  if (isDev) console.warn(...args);
};

export const devError = (...args: unknown[]): void => {
  if (isDev) console.error(...args);
};

export const devInfo = (...args: unknown[]): void => {
  if (isDev) console.info(...args);
};
