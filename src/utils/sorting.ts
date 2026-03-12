export const sortAssetsNumerically = <T>(assets: T[], nameKey: keyof T): T[] => {
  return [...assets].sort((a, b) => {
    const nameA = String(a[nameKey] || '').toLowerCase();
    const nameB = String(b[nameKey] || '').toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });
};
