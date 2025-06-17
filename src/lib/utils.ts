import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utilitaire pour combiner les classes CSS de manière intelligente
 * 
 * Cette fonction combine clsx et tailwind-merge pour :
 * - Gérer les classes conditionnelles avec clsx
 * - Résoudre les conflits de classes Tailwind avec twMerge
 * 
 * @param inputs - Classes CSS à combiner (string, object, array, etc.)
 * @returns String de classes CSS optimisée
 * 
 * @example
 * cn('bg-red-500', 'bg-blue-500') // => 'bg-blue-500' (résout le conflit)
 * cn('text-lg', { 'font-bold': isImportant }) // => 'text-lg font-bold' si isImportant
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
