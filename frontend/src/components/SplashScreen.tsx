import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readyTimer = setTimeout(() => setReady(true), 150);
    const exitTimer = setTimeout(() => setExiting(true), 2400);
    return () => {
      clearTimeout(readyTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    if (!exiting) return;
    const doneTimer = setTimeout(onComplete, 500);
    return () => clearTimeout(doneTimer);
  }, [exiting, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ease-in-out ${
        exiting ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
      }`}
      style={{ backgroundColor: '#fafafa' }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 50%, transparent 70%)',
              animation: 'glow-breathe 4s ease-in-out infinite',
            }}
          />
          <img
            src="/logo.png"
            alt="mugna"
            className={`w-56 sm:w-72 h-auto object-contain transition-all duration-800 ease-out ${
              ready ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
            }`}
          />
        </div>

        <div
          className={`flex flex-col items-center gap-6 transition-all duration-600 delay-300 ${
            ready ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <span className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            mugna
          </span>
        </div>

        <div
          className={`flex gap-2 transition-all duration-500 delay-500 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-zinc-300"
              style={{
                animation: `chat-dot 1.4s ease-in-out ${i * 0.2}s infinite both`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
