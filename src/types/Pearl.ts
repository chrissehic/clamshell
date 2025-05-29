export interface Pearl {
    id: string;
    type: 'url' | 'image' | 'file'; // Extend as needed
    content: string; // URL, image source, or file path
    metadata?: {
        title?: string;
        description?: string;
        previewImage?: string;
    };
    htmlContent?: string,
    createdAt: Date;
}