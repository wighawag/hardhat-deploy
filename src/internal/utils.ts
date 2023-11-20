export function bnReplacer(k: string, v: any): any {
  if (typeof v === 'bigint') {
    return v.toString();
  }
  return v;
}
