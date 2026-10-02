import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { SproutIcon } from 'lucide-react';

export function SplashScreen() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      aria-label="Loading Imari"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-canvas">
      
      <div className="relative flex h-20 w-20 items-center justify-center">
        <motion.span
          className="absolute inset-0 rounded-full border-[3px] border-brand-100 border-t-brand-600"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
        
        <motion.span
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white">
          
          <SproutIcon className="h-6 w-6" />
        </motion.span>
      </div>
      <p className="mt-6 text-lg font-semibold tracking-tight text-ink">Imari</p>
      <p className="mt-1 text-sm text-muted">Preparing your learning space…</p>
      <div className="mt-6 h-1 w-44 overflow-hidden rounded-full bg-brand-100">
        <motion.div
          className="h-full rounded-full bg-brand-600"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
        
      </div>
    </motion.div>);

}