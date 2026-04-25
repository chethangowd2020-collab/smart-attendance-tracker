import clsx from 'clsx';

export default function CircularProgress({ value, max = 100, size = 60, strokeWidth = 6, colorClass = "text-blue-500" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(Math.max(value, 0), max);
  const strokeDashoffset = circumference - (percent / max) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={clsx("transition-all duration-500 ease-out", colorClass)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-white">
        <span className="text-sm font-semibold">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}
