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
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="w-full max-w-sm border border-slate-200 bg-white p-8 text-slate-800"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Finished</div>
            <div className="mt-1 font-display text-3xl font-bold text-slate-900">The end</div>
            <p className="mb-6 mt-2 text-sm text-slate-500">You finished “{title}”.</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRestart}
                className="flex cursor-pointer items-center gap-2 bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
              >
                <RotateCcw size={14} /> Read again
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex cursor-pointer items-center gap-2 border border-slate-300 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-900 transition-colors hover:border-slate-900"
              >
                <House size={14} /> Home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
