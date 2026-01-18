import { useState, useCallback, useEffect } from 'react';

export function useColumnResize(keyOrInitialWidths: string | Record<string, number>, initialWidthsOpt?: Record<string, number>) {
    const storageKey = typeof keyOrInitialWidths === 'string' ? keyOrInitialWidths : null;
    const initialWidths = typeof keyOrInitialWidths === 'string' ? (initialWidthsOpt || {}) : keyOrInitialWidths;

    const [widths, setWidths] = useState<Record<string, number>>(() => {
        if (storageKey) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    return { ...initialWidths, ...JSON.parse(saved) };
                }
            } catch (e) {
                console.error("Failed to load column widths", e);
            }
        }
        return initialWidths;
    });

    const [resizingCol, setResizingCol] = useState<{ key: string, startX: number, startWidth: number } | null>(null);

    // Save to storage
    useEffect(() => {
        if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(widths));
        }
    }, [widths, storageKey]);

    const startResizing = useCallback((key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingCol({
            key,
            startX: e.clientX,
            startWidth: widths[key],
        });
    }, [widths]);

    useEffect(() => {
        if (!resizingCol) return;

        const onMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - resizingCol.startX;
            const newWidth = Math.max(50, resizingCol.startWidth + diff);
            setWidths((prev) => ({
                ...prev,
                [resizingCol.key]: newWidth,
            }));
        };

        const onMouseUp = () => {
            setResizingCol(null);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [resizingCol]);

    const handleResize = useCallback((key: string) => (e: React.MouseEvent) => startResizing(key, e), [startResizing]);

    return { widths, startResizing, handleResize };
}
