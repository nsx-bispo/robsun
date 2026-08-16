import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AnimatePresence,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'
import logo from '../assets/logo-robsun.svg'
import './app-v6.css'
import './calculator-mobile-polish.css'
