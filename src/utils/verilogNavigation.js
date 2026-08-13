export const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseInstantiationLine = (lineText = '') => {
    const cleanText = String(lineText || '').trim();
    const match = cleanText.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)\s+([a-zA-Z_][a-zA-Z0-9_$]*)\s*(?:#\s*\(|\()/);
    if (!match) return null;
    return {
        moduleName: match[1],
        instanceName: match[2],
    };
};

export const hasExactIdentifierToken = (lineText = '', identifier = '') => {
    if (!identifier) return false;
    return new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(String(lineText || ''));
};

export const parseWireDeclarationLine = (lineText = '') => {
    const cleanText = String(lineText || '').trim();
    const match = cleanText.match(/^wire\s+(?:\[[^\]]+\]\s*)?(w_[a-zA-Z_][a-zA-Z0-9_$]*)\s*(?:[,;=]|$)/);
    if (!match) return null;
    return {
        wireName: match[1],
    };
};

export const isNavigableWireLine = (lineText = '') => {
    const cleanText = String(lineText || '').trim();
    return !!parseWireDeclarationLine(cleanText) || /\bassign\s+w_[a-zA-Z_][a-zA-Z0-9_$]*/.test(cleanText);
};
