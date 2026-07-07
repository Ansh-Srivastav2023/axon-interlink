// src/components/LeftPanel/helpers.js
export const hoverScaleShadow = (e, scale = 1.12, shadowColor = 'rgba(255, 255, 255, 0.2)') => {
    e.currentTarget.style.transform = `scale(${scale})`;
    e.currentTarget.style.boxShadow = `0px 4px 15px ${shadowColor}`;
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
    e.currentTarget.style.backdropFilter = 'blur(8px)';
    e.currentTarget.style.filter = 'brightness(1.1)';
};

export const unhoverScaleShadow = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
    e.currentTarget.style.backdropFilter = 'blur(8px)';
    e.currentTarget.style.filter = 'brightness(1)';
};