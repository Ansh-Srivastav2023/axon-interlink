export const toPositiveWidth = (value, fallback = 1) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
};

export const normalizeSlice = (slice, portWidth) => {
    if (!slice || typeof slice !== 'object') return null;
    const width = toPositiveWidth(portWidth, 1);
    const msb = Number(slice.msb);
    const lsb = Number(slice.lsb);
    if (!Number.isInteger(msb) || !Number.isInteger(lsb)) return null;
    const high = Math.max(msb, lsb);
    const low = Math.min(msb, lsb);
    if (low < 0 || high >= width) return null;
    return { msb: high, lsb: low };
};

export const sliceWidth = (slice) => {
    if (!slice) return null;
    return Math.abs(Number(slice.msb) - Number(slice.lsb)) + 1;
};

export const isFullSlice = (slice, portWidth) => {
    const normalized = normalizeSlice(slice, portWidth);
    const width = toPositiveWidth(portWidth, 1);
    return !!normalized && normalized.lsb === 0 && normalized.msb === width - 1;
};

export const makeCompactSlice = (msb, lsb, portWidth) => {
    const normalized = normalizeSlice({ msb: Number(msb), lsb: Number(lsb) }, portWidth);
    if (!normalized || isFullSlice(normalized, portWidth)) return null;
    return normalized;
};

export const getTargetSlice = (edge, targetPort) =>
    normalizeSlice(edge?.data?.targetSlice, toPositiveWidth(targetPort?.width, 1));

export const getSourceSlice = (edge, sourcePort) =>
    normalizeSlice(edge?.data?.sourceSlice, toPositiveWidth(sourcePort?.width, 1));

export const getSourceWidth = (edge, sourcePort) => {
    const slice = getSourceSlice(edge, sourcePort);
    return slice ? sliceWidth(slice) : toPositiveWidth(sourcePort?.width, 1);
};

export const getTargetWidth = (edge, targetPort) => {
    const slice = getTargetSlice(edge, targetPort);
    return slice ? sliceWidth(slice) : toPositiveWidth(targetPort?.width, 1);
};

export const formatSlice = (slice, portWidth) => {
    const normalized = normalizeSlice(slice, portWidth);
    if (!normalized) return '';
    return normalized.msb === normalized.lsb ? `[${normalized.msb}]` : `[${normalized.msb}:${normalized.lsb}]`;
};

export const applyTargetSlice = (signalName, edge, targetPort) => {
    const slice = getTargetSlice(edge, targetPort);
    return slice ? `${signalName}${formatSlice(slice, targetPort?.width)}` : signalName;
};

export const applySourceSlice = (signalName, edge, sourcePort) => {
    const slice = getSourceSlice(edge, sourcePort);
    return slice ? `${signalName}${formatSlice(slice, sourcePort?.width)}` : signalName;
};

export const rangesOverlap = (a, b) => {
    if (!a || !b) return true;
    return a.lsb <= b.msb && b.lsb <= a.msb;
};

export const findFirstFreeTargetSlice = (sliceWidthValue, targetWidth, occupiedSlices = []) => {
    const desiredWidth = toPositiveWidth(sliceWidthValue, 1);
    const width = toPositiveWidth(targetWidth, 1);
    if (desiredWidth >= width) return null;

    for (let lsb = 0; lsb <= width - desiredWidth; lsb += desiredWidth) {
        const candidate = { lsb, msb: lsb + desiredWidth - 1 };
        if (occupiedSlices.every((occupied) => !rangesOverlap(candidate, occupied))) {
            return candidate;
        }
    }

    for (let lsb = 0; lsb <= width - desiredWidth; lsb += 1) {
        const candidate = { lsb, msb: lsb + desiredWidth - 1 };
        if (occupiedSlices.every((occupied) => !rangesOverlap(candidate, occupied))) {
            return candidate;
        }
    }

    return null;
};

export const createDefaultTargetSlice = (sourceWidth, targetWidth, existingTargetSlices = []) => {
    const srcWidth = toPositiveWidth(sourceWidth, 1);
    const tgtWidth = toPositiveWidth(targetWidth, 1);
    if (srcWidth >= tgtWidth) return null;
    return findFirstFreeTargetSlice(srcWidth, tgtWidth, existingTargetSlices);
};

export const createDefaultSourceSlice = (sourceWidth, targetWidth) => {
    const srcWidth = toPositiveWidth(sourceWidth, 1);
    const tgtWidth = toPositiveWidth(targetWidth, 1);
    if (srcWidth <= tgtWidth) return null;
    return { msb: tgtWidth - 1, lsb: 0 };
};

export const getEdgeEffectiveWidths = (edge, sourcePort, targetPort) => {
    const sourceWidth = getSourceWidth(edge, sourcePort);
    const targetWidth = getTargetWidth(edge, targetPort);
    return {
        sourceWidth,
        targetWidth,
        bitWidth: Math.min(sourceWidth, targetWidth),
    };
};
