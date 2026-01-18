export function formatTemplate(
  text: string,
  values: Record<string, string>
) {
  return text.replace(/\{\{(.*?)\}\}/g, (_, key) => values[key.trim()] ?? "");
}
