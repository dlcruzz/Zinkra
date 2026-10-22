'use client';
import { motion, useScroll, useSpring } from 'framer-motion';

/** Barra fina de progresso de rolagem no topo da página. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed left-0 right-0 top-0 z-[70] h-[3px] origin-left bg-brand"
      style={{ scaleX }}
    />
  );
}
