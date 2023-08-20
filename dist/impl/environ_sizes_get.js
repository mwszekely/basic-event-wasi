export function environ_sizes_get(environCountOutput, environSizeOutput) {
    this.writeUint32(environCountOutput, 0);
    this.writeUint32(environSizeOutput, 0);
    return 0;
}
