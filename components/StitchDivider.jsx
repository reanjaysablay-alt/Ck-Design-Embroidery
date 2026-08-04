export default function StitchDivider({ className = '', color = '#D4A537' }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="w-full h-6"
      >
        <path
          d="M0 12 Q 30 2, 60 12 T 120 12 T 180 12 T 240 12 T 300 12 T 360 12 T 420 12 T 480 12 T 540 12 T 600 12 T 660 12 T 720 12 T 780 12 T 840 12 T 900 12 T 960 12 T 1020 12 T 1080 12 T 1140 12 T 1200 12"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="10 8"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
