interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 4, className = '' }: SpinnerProps) {
  return (
    <div
      className={`inline-block border-2 border-white/30 border-t-white rounded-full animate-spin ${className}`}
      style={{ width: `${size * 0.25}rem`, height: `${size * 0.25}rem` }}
    />
  );
}
