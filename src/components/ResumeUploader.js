import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
export default function ResumeUploader({ onUpload }) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);
    const handleFile = async (file) => {
        setError(null);
        if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('word')) {
            setError('Please upload a PDF or Word document (.pdf, .docx, .doc)');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB');
            return;
        }
        setIsLoading(true);
        try {
            await onUpload(file);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process resume');
            setIsLoading(false);
        }
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => {
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file)
            handleFile(file);
    };
    const handleFileSelect = (e) => {
        const file = e.currentTarget.files?.[0];
        if (file)
            handleFile(file);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h2", { className: "section-title mb-2", children: "Upload Your Resume" }), _jsx("p", { className: "section-subtitle", children: "Upload your current CV to get started with optimization" })] }), _jsxs("div", { onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => !isLoading && fileInputRef.current?.click(), className: `card cursor-pointer border-2 border-dashed transition-all ${isLoading ? 'opacity-60 cursor-not-allowed' : ''} ${isDragging
                    ? 'border-black dark:border-white bg-gray-50 dark:bg-dark-card'
                    : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-600'}`, children: [_jsx("input", { ref: fileInputRef, type: "file", onChange: handleFileSelect, accept: ".pdf,.doc,.docx", className: "hidden", disabled: isLoading }), _jsxs("div", { className: "flex flex-col items-center justify-center py-12", children: [_jsx("div", { className: "w-16 h-16 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center mb-4", children: isLoading ? (_jsx("div", { className: "animate-spin", children: _jsx(Upload, { className: "w-8 h-8 text-gray-600 dark:text-dark-text-secondary" }) })) : (_jsx(Upload, { className: "w-8 h-8 text-gray-600 dark:text-dark-text-secondary" })) }), _jsx("h3", { className: "text-lg font-semibold mb-1", children: isLoading ? 'Processing resume...' : 'Drop your resume here' }), _jsx("p", { className: "text-gray-600 dark:text-dark-text-secondary text-center", children: isLoading ? 'Extracting text and preparing analysis...' : 'or click to browse. Supports PDF, DOCX, DOC' }), _jsx("p", { className: "text-sm text-gray-500 dark:text-dark-text-secondary mt-2", children: "Max file size: 10MB" })] })] }), error && (_jsxs("div", { className: "flex gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" }), _jsx("p", { className: "text-red-700 dark:text-red-300 text-sm", children: error })] })), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4", children: [_jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0", children: _jsx(FileText, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm", children: "Supported Formats" }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary", children: "PDF, Word Documents" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0", children: _jsx(Upload, { className: "w-5 h-5 text-green-600 dark:text-green-400" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm", children: "Quick Upload" }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary", children: "Drag or click" })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0", children: _jsx(FileText, { className: "w-5 h-5 text-purple-600 dark:text-purple-400" }) }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-sm", children: "Privacy First" }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary", children: "Data stays secure" })] })] })] })] }));
}
