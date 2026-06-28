import { useEffect } from 'react';

/** Sets document.title to "<page> — KidsWear"; restores on unmount. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — KidsWear` : 'KidsWear';
    return () => {
      document.title = previous;
    };
  }, [title]);
}
