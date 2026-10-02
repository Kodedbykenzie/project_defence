import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

/** Thin top bar that confirms a navigation happened. */
export function RouteProgress() {
  const { pathname } = useLocation();
  const [key, setKey] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setKey((k) => k + 1);
  }, [pathname]);

  if (key === 0) return null;
  return (
    <motion.div
      key={key}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] rounded-r-full bg-brand-600"
      initial={{ width: '0%', opacity: 1 }}
      animate={{ width: '100%', opacity: 0 }}
      transition={{ width: { duration: 0.35, ease: [0.23, 1, 0.32, 1] }, opacity: { duration: 0.2, delay: 0.3 } }} />);


}