import React from 'react';
import { Download, XIcon, Star, UserPlus, Wand2, Image } from './icons';

interface ImagePreviewModalProps {
    imageUrl: string | null;
    onClose: () => void;
    onDownload: () => void;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
    onUseAsUserImage?: () => void;
    onLoadInEditor?: () => void;
    onUseAsReference?: () => void;
}

const ActionButton: React.FC<{
    label: string;
    onClick: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    className?: string;
}> = ({ label, onClick, children, className }) => (
    <div className="relative group flex items-center">
        <button
            onClick={onClick}
            className={`p-2 rounded-full bg-black/50 hover:bg-black/80 transition-colors ${className}`}
            aria-label={label}
        >
            {children}
        </button>
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-black/80 text-white text-xs font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none transform translate-x-2 group-hover:translate-x-0">
            {label}
        </div>
    </div>
);


export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
    imageUrl, 
    onClose, 
    onDownload, 
    isFavorite, 
    onToggleFavorite, 
    onUseAsUserImage, 
    onLoadInEditor,
    onUseAsReference
}) => {
    if (!imageUrl) return null;

    const handleDownloadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownload();
    };

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose();
    };
    
    const handleFavoriteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite?.();
    };

    const handleUseAsUserImageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUseAsUserImage?.();
    };
    
    const handleUseAsReferenceClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUseAsReference?.();
    };

    const handleLoadInEditorClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLoadInEditor?.();
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-in fade-in-0"
            onClick={onClose}
        >
            <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
                <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="block max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                />
            </div>
            <button 
                onClick={handleCloseClick} 
                className="absolute top-4 right-4 z-[101] bg-black/50 text-white rounded-full p-2 hover:bg-black/80 transition-colors"
                aria-label="Close preview"
            >
                <XIcon className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 right-4 z-[101] flex flex-col items-end gap-3">
                {onToggleFavorite && (
                    <ActionButton
                        onClick={handleFavoriteClick}
                        label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        className={isFavorite ? 'text-yellow-400' : 'text-white'}
                    >
                        <Star className="w-6 h-6" />
                    </ActionButton>
                )}
                 {onLoadInEditor && (
                    <ActionButton 
                        onClick={handleLoadInEditorClick}
                        label="Load in Editor"
                        className="text-white"
                    >
                        <Wand2 className="w-6 h-6" />
                    </ActionButton>
                )}
                 {onUseAsUserImage && (
                    <ActionButton
                        onClick={handleUseAsUserImageClick}
                        label="Use as Face/Logo"
                        className="text-white"
                    >
                        <UserPlus className="w-6 h-6" />
                    </ActionButton>
                )}
                 {onUseAsReference && (
                    <ActionButton
                        onClick={handleUseAsReferenceClick}
                        label="Use as Reference"
                        className="text-white"
                    >
                        <Image className="w-6 h-6" />
                    </ActionButton>
                )}
                 <ActionButton
                    onClick={handleDownloadClick}
                    label="Download"
                    className="text-white"
                >
                    <Download className="w-6 h-6" />
                </ActionButton>
            </div>
        </div>
    );
};