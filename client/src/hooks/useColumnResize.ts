import { useState, useCallback, useEffect } from 'react';

export function useColumnResize(initialWidths: Record<string, number>) {
    const [widths, setWidths] = useState(initialWidths);
    const [resizingCol, setResizingCol] = useState<{ key: string, startX: number, startWidth: number } | null>(null);

    const startResizing = useCallback((key: string, e: React.MouseEvent) => {
        e.preventDefault();
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
            const newWidth = Math.max(50, resizingCol.startWidth + diff); // Min width 50px
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

    return { widths, startResizing };
}
