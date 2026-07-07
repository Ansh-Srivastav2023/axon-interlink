import { useId, useEffect, useState } from 'react';

export const AppLogo = ({ size = 28, t }) => {
    const rawId = useId();
    const uid = rawId.replace(/:/g, ''); // Remove colons from useId
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const scale = isMobile ? 38 : size;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true); // Only animate after client mount
    }, []);

    return (
        <div style={{ display: "flex", alignItems: "center", userSelect: "none" }}>
            <style>{`
                /* Advanced accelerated data wave simulation */
                @keyframes logoFlow {
                    0% { offset-distance: 0%; opacity: 0; transform: scale(0.4); }
                    6% { opacity: 1; transform: scale(1.1); }
                    14% { transform: scale(0.95); }
                    85% { opacity: 1; }
                    100% { offset-distance: 100%; opacity: 0; transform: scale(0.3); }
                }
                /* Smooth micro-breathing indicator pulse */
                @keyframes logoPulse {
                    0%, 100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 2px rgba(124, 58, 237, 0.3)); }
                    50% { transform: scale(1.04); filter: brightness(1.15) drop-shadow(0 0 8px rgba(6, 182, 212, 0.6)); }
                }
                /* Subtle color vector transition */
                @keyframes logoGradient {
                    0%, 100% { stop-color: #06B6D4; }
                    50% { stop-color: #7C3AED; }
                }
                .logo-pulse-${uid} {
                    animation: logoPulse 2.8s ease-in-out infinite;
                    transform-origin: center;
                    will-change: transform, filter;
                }
                .logo-flow-${uid} {
                    offset-path: path(var(--path));
                    /* Custom easing curves simulate circuit transmission acceleration */
                    animation: logoFlow var(--dur) cubic-bezier(0.25, 1, 0.5, 1) infinite;
                    animation-delay: var(--delay);
                    transform-origin: center;
                    will-change: offset-distance, opacity, transform;
                }
            `}</style>

            <svg
                width={scale}
                height={scale}
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0, overflow: 'visible' }}
            >
                <defs>
                    <linearGradient id={`logoGrad-${uid}`} x1="60" y1="60" x2="450" y2="450" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6D28D9" />
                        <stop offset="25%" stopColor="#7C3AED" />
                        <stop offset="50%" stopColor="#4F46E5" />
                        <stop offset="75%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#06B6D4" style={mounted ? { animation: 'logoGradient 4s ease-in-out infinite' } : {}} />
                    </linearGradient>

                    <filter id={`logoGlow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <radialGradient id={`pulse-${uid}`} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="30%" stopColor="#2563EB" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Base Network Paths */}
                <g
                    stroke={`url(#logoGrad-${uid})`}
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    filter={`url(#logoGlow-${uid})`}
                    opacity="0.6"
                >
                    <path d="M160 130 C235 130 235 190 310 190" />
                    <path d="M160 130 C235 130 235 315 310 315" />
                    <path d="M310 190 C360 190 360 250 410 250" />
                    <path d="M310 315 C360 315 360 250 410 250" />
                    <path d="M160 380 C235 380 235 315 310 315" />
                </g>

                {/* High-fidelity fluid animated signal dots */}
                {mounted && (
                    <g fill={`url(#pulse-${uid})`} filter={`url(#logoGlow-${uid})`}>
                        <circle r="13" className={`logo-flow-${uid}`} style={{ '--path': '"M160 130 C235 130 235 190 310 190"', '--dur': '2.2s', '--delay': '0s' }} />
                        <circle r="13" className={`logo-flow-${uid}`} style={{ '--path': '"M160 130 C235 130 235 315 310 315"', '--dur': '2.6s', '--delay': '0.5s' }} />
                        <circle r="13" className={`logo-flow-${uid}`} style={{ '--path': '"M310 190 C360 190 360 250 410 250"', '--dur': '1.6s', '--delay': '0.8s' }} />
                        <circle r="13" className={`logo-flow-${uid}`} style={{ '--path': '"M310 315 C360 315 360 250 410 250"', '--dur': '1.8s', '--delay': '1.1s' }} />
                        <circle r="13" className={`logo-flow-${uid}`} style={{ '--path': '"M160 380 C235 380 235 315 310 315"', '--dur': '2.4s', '--delay': '0.3s' }} />
                    </g>
                )}

                {/* Junction Nodes with optimized staggered pulse delays */}
                <g fill={`url(#logoGrad-${uid})`} filter={`url(#logoGlow-${uid})`}>
                    <circle cx="160" cy="130" r="28" className={mounted ? `logo-pulse-${uid}` : ''} style={{ animationDelay: '0s' }} />
                    <circle cx="160" cy="380" r="28" className={mounted ? `logo-pulse-${uid}` : ''} style={{ animationDelay: '0.4s' }} />
                    <circle cx="310" cy="190" r="28" className={mounted ? `logo-pulse-${uid}` : ''} style={{ animationDelay: '0.8s' }} />
                    <circle cx="310" cy="315" r="28" className={mounted ? `logo-pulse-${uid}` : ''} style={{ animationDelay: '0.2s' }} />
                    <circle cx="410" cy="250" r="34" className={mounted ? `logo-pulse-${uid}` : ''} style={{ animationDelay: '0.6s' }} />
                </g>
            </svg>

            <div
                style={{
                    marginLeft: "8px",
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    fontSize: isMobile ? "14px" : "32px",
                    lineHeight: isMobile ? "1.1" : "1",
                    fontFamily: "monospace",
                    fontWeight: 300,
                    letterSpacing: "0.02em",
                    WebkitFontSmoothing: "antialiased",
                    MozOsxFontSmoothing: "grayscale",
                }}
            >
                <span style={{ color: t?.textHeading || "#ffffff" }}>Axon{isMobile ? "" : "\u00A0"}</span>
                <span
                    style={{
                        background: "linear-gradient(90deg, #7C3AED, #2563EB)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        fontWeight: 600,
                        color: "transparent",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    Interlink
                </span>
            </div>
        </div>
    );
};