import React, { useState, useRef, useEffect } from 'react';
import { XIcon } from './icons';

interface BeforeAfterSliderModalProps {
    isOpen: boolean;
    onClose: () => void;
    originalImage: string | null;
    editedImage: string | null;
}

export const BeforeAfterSliderModal: React.FC<BeforeAfterSliderModalProps> = ({ isOpen, onClose, originalImage, editedImage }) => {
    const [sliderValue, setSliderValue] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSliderValue(50); // Reset slider on open
        }
    }, [isOpen]);

    if (!isOpen || !originalImage || !editedImage) return null;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSliderValue(Number(e.target.value));
    };
    
    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };

    const imageStyle: React.CSSProperties = {
        maxWidth: '90vw',
        maxHeight: '80vh',
        objectFit: 'contain',
        width: 'auto',
        height: 'auto',
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in-0"
            onClick={onClose}
        >
            <div 
                ref={containerRef}
                className="relative select-none" 
                style={{ aspectRatio: '16 / 9' }}
                onClick={e => e.stopPropagation()}
            >
                <img src={originalImage} alt="Before" style={imageStyle} className="block pointer-events-none rounded-lg" />
                
                <div 
                    className="absolute top-0 left-0 h-full w-full overflow-hidden pointer-events-none rounded-lg" 
                    style={{ clipPath: `inset(0 ${100 - sliderValue}% 0 0)` }}
                >
                    <img src={editedImage} alt="After" style={imageStyle} className="block h-full w-full" />
                </div>
                
                <div 
                    className="absolute top-0 left-0 h-full w-px bg-white/80 pointer-events-none"
                    style={{ left: `${sliderValue}%` }}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white/80 shadow-lg grid place-items-center">
                         <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path></svg>
                    </div>
                </div>

                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sliderValue} 
                    onChange={handleSliderChange}
                    className="absolute top-0 left-0 w-full h-full cursor-pointer opacity-0"
                    aria-label="Before and after slider"
                />
            </div>

            <button 
                onClick={handleCloseClick} 
                className="absolute top-4 right-4 z-[101] bg-black/50 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
                aria-label="Close preview"
            >
                <XIcon className="w-6 h-6" />
            </button>
        </div>
    );
};