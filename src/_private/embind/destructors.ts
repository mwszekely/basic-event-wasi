
export function runDestructors(destructors: (() => void)[]): void {
    while (destructors.length) {
        destructors.pop()!();
    }
}
