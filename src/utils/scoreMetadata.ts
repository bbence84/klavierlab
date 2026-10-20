export function titleFromFileName(fileName: string): string {
  let name = fileName.split(/[\\/]/).at(-1) || '';
  try { name = decodeURIComponent(name); } catch {}
  return name
    .replace(/\.(mid|midi|musicxml|xml|mxl)$/i, '')
    .normalize('NFKC')
    .replace(/([\p{Ll}\p{Nd}])(\p{Lu})/gu, '$1 $2')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[\s\u0000-\u001F\u007F]+/g, ' ')
    .trim()
    .replace(/(^|[\s([{])(\p{L})/gu, (_match, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase())
    || 'Imported score';
}