import { useEffect } from 'react';

/**
 * Custom hook to set the document title
 * @param title - The title to set for the current page
 */
export function useDocumentTitle(title: string) {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = `${title} | (주)광주텔레콤`;

        return () => {
            document.title = prevTitle;
        };
    }, [title]);
}
