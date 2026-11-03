export function formatElapsedTime(value?: string | null) {
  if (!value) return "À l'instant";

  const elapsedMs = Date.now() - new Date(value).getTime();
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

  if (elapsedMinutes < 1) return "À l'instant";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    const remainingMinutes = elapsedMinutes % 60;
    return remainingMinutes > 0
      ? `${elapsedHours} h ${remainingMinutes} min`
      : `${elapsedHours} h`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "1 jour" : `${elapsedDays} jours`;
}
