import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    x: 40,
  },
  animate: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    x: 80,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export default function ChatAnimation({ children, routeKey }) {
  return (
    <AnimatePresence mode="wait">
      {routeKey ? (
        <motion.div
          key={routeKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layoutId="chat-card"
          className="chat-page bg-base-100 flex flex-col absolute inset-0 z-20"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
