
export function combine(a: number, b: number): number {
    return a * b / (a * b + (1 - a) * (1 - b));
}

export function split(ab: number, a: number): number {
    return (ab - ab * a) / (ab - 2 * ab * a + a);
}