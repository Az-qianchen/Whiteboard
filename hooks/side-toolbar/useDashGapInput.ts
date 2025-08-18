import React, { useState, useEffect, useCallback } from 'react';
import { useWheelCoalescer } from './useWheelCoalescer';

interface DashGapInputProps {
    strokeLineDash: [number, number] | undefined;
    setStrokeLineDash: (dash: [number, number] | undefined) => void;
    strokeWidth: number;
    setStrokeLineCapStart: (cap: any) => void;
    setStrokeLineCapEnd: (cap: any) => void;
    beginCoalescing: () => void;
    endCoalescing: () => void;
}

export const useDashGapInput = ({
    strokeLineDash,
    setStrokeLineDash,
    strokeWidth,
    setStrokeLineCapStart,
    setStrokeLineCapEnd,
    beginCoalescing,
    endCoalescing,
}: DashGapInputProps) => {
    const isDashed = strokeLineDash !== undefined;
    const [localDash, setLocalDash] = useState('0');
    const [localGap, setLocalGap] = useState('0');

    useEffect(() => {
        if (strokeLineDash) {
            // If it's the special dotted line value, show '0' in UI.
            if (strokeLineDash[0] === 0.1) {
                setLocalDash('0');
            } else {
                setLocalDash(strokeLineDash[0].toString());
            }
            setLocalGap(strokeLineDash[1].toString());
        } else {
            // Reset to a sensible default when dashing is off
            setLocalDash('20');
            setLocalGap('10');
        }
    }, [strokeLineDash]);


    const handleToggleDashed = (enabled: boolean) => {
        if (enabled) {
            let dash = parseInt(localDash, 10);
            let gap = parseInt(localGap, 10);
            if (isNaN(dash) || dash < 0) dash = 20;
            if (isNaN(gap) || gap <= 0) gap = 10;
            
            if (dash === 0) {
                setStrokeLineCapStart('round');
                setStrokeLineCapEnd('round');
                setStrokeLineDash([0.1, gap > 0 ? gap : strokeWidth * 2]);
            } else {
                setStrokeLineDash([dash, gap]);
            }
        } else {
            setStrokeLineDash(undefined);
        }
    };

    const handleCommit = () => {
        if (!isDashed) return;

        let dash = parseInt(localDash, 10);
        let gap = parseInt(localGap, 10);

        const currentDashValue = strokeLineDash ? (strokeLineDash[0] === 0.1 ? 0 : strokeLineDash[0]) : 0;
        dash = isNaN(dash) ? currentDashValue : Math.max(0, dash);
        gap = isNaN(gap) ? (strokeLineDash?.[1] ?? 0) : Math.max(0, gap);

        if (dash === 0) {
            setStrokeLineCapStart('round');
            setStrokeLineCapEnd('round');
            const finalGap = gap > 0 ? gap : strokeWidth * 2;
            setStrokeLineDash([0.1, finalGap]);
        } else {
            if (dash > 0 && gap <= 0) {
                gap = dash;
            }
            setStrokeLineDash([dash, gap]);
        }
    };

    const handleWheel = useWheelCoalescer(beginCoalescing, endCoalescing);

    const handleDashWheel = (e: React.WheelEvent) => {
        if (!isDashed) return;
        handleWheel(e, (increment) => {
            const currentDash = strokeLineDash ? (strokeLineDash[0] === 0.1 ? 0 : strokeLineDash[0]) : 0;
            const currentGap = strokeLineDash ? strokeLineDash[1] : 0;
            const newDash = Math.max(0, currentDash + increment);

            if (newDash === 0) {
                setStrokeLineCapStart('round');
                setStrokeLineCapEnd('round');
                const newGap = (currentGap <= 0) ? strokeWidth * 2 : currentGap;
                setStrokeLineDash([0.1, newGap]);
            } else {
                const newGap = (currentGap <= 0 && newDash > 0) ? newDash : currentGap;
                setStrokeLineDash([newDash, newGap]);
            }
        });
    };
  
    const handleGapWheel = (e: React.WheelEvent) => {
        if (!isDashed) return;
        handleWheel(e, (increment) => {
            const [currentDash] = strokeLineDash ?? [0, 0];
            const currentGap = strokeLineDash ? strokeLineDash[1] : 0;
            const newGap = Math.max(0, currentGap + increment);
            setStrokeLineDash([currentDash, newGap]);
        });
    };

    return {
        isDashed,
        localDash,
        setLocalDash,
        localGap,
        setLocalGap,
        handleToggleDashed,
        handleCommit,
        handleDashWheel,
        handleGapWheel
    };
};
