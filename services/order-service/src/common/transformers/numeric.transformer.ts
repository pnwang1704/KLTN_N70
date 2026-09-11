export const columnNumericTransformer = {
  to: (data: number): number => data,
  from: (data: string | number | null | undefined): number => {
    if (data === null || data === undefined) return 0;
    const num = Number(data);
    return isNaN(num) ? 0 : Math.round(num);
  },
};
