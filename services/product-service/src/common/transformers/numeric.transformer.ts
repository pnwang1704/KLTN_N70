import { ValueTransformer } from 'typeorm';

export const columnNumericTransformer: ValueTransformer = {
  to: (data: number): number => data,
  from: (data: string | number): number => {
    if (data === null || data === undefined) return 0;
    const parsed = typeof data === 'number' ? data : parseFloat(data);
    return isNaN(parsed) ? 0 : parsed;
  },
};

