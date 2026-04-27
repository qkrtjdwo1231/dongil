export function calculateAreaPyeong(
  width: number | null | undefined,
  height: number | null | undefined,
  quantity: number | null | undefined
) {
  if (!width || !height || !quantity) {
    return null;
  }

  const area = (width * height * quantity) / 1000000 / 3.3058;
  return Number(area.toFixed(2));
}
