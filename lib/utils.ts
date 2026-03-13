import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names using clsx and tailwind-merge.
 *
 * Combines multiple class values (strings, arrays, objects) and resolves
 * Tailwind CSS conflicts so the last conflicting utility wins.
 *
 * @param inputs - Any number of class values accepted by clsx
 * @returns A single merged className string
 *
 * @example
 * cn("px-4 py-2", "px-8")          // "py-2 px-8"
 * cn("text-red-500", { "font-bold": true })  // "text-red-500 font-bold"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
