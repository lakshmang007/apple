import { AnimatePresence, motion } from 'motion/react';
import { House, RotateCcw } from 'lucide-react';

export function EndCard({
  show,
  title,
  onRestart,
  onExit,
}: {
  show: boolean;
  title: string;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          data-chrome
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="glass w-full max-w-sm rounded-3xl p-8 text-center"
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <motion.div
              className="sfx-text mb-2 text-7xl text-yellow-300"
              initial={{ rotate: -12, scale: 2.4, opacity: 0 }}
              animate={{ rotate: -4, scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 14 }}
            >
              THE END!
            </motion.div>
            <p className="mb-6 text-sm text-white/65">You finished “{title}”.</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:scale-105"
              >
                <RotateCcw size={16} /> Read again
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <House size={16} /> Home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
