export const AppLogo = ({ size = 28, t }) => {
    // Detect mobile layout footprint
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            <svg
                width={isMobile ? 38 : size} // Scale down slightly on mobile screens
                height={isMobile ? 38 : size}
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
            >
                <defs>
                    <linearGradient id="logoGrad" x1="60" y1="60" x2="450" y2="450" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#6D28D9" />
                        <stop offset="25%" stopColor="#7C3AED" />
                        <stop offset="50%" stopColor="#4F46E5" />
                        <stop offset="75%" stopColor="#2563EB" />
                        <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>

                    <filter id="logoGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Network Paths */}
                <g
                    stroke="url(#logoGrad)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    filter="url(#logoGlow)"
                >
                    <path d="M160 130 C235 130 235 190 310 190" />
                    <path d="M160 130 C235 130 235 315 310 315" />
                    <path d="M310 190 C360 190 360 250 410 250" />
                    <path d="M310 315 C360 315 360 250 410 250" />
                    <path d="M160 380 C235 380 235 315 310 315" />
                </g>

                {/* Junction Nodes */}
                <g fill="url(#logoGrad)" filter="url(#logoGlow)">
                    <circle cx="160" cy="130" r="28" />
                    <circle cx="160" cy="380" r="28" />
                    <circle cx="310" cy="190" r="28" />
                    <circle cx="310" cy="315" r="28" />
                    <circle cx="410" cy="250" r="34" />
                </g>
            </svg>

            {/* RESPONSIVE TEXT WRAPPER CONTAINER */}
            <div
                style={{
                    marginLeft: "8px",
                    // Use flexbox column layout to force stacking on mobile viewports
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "flex-start" : "center",
                    fontSize: isMobile ? "14px" : "32px", // Tight, matching sizing for mobile header rows
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