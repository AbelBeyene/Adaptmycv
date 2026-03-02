import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
export default function JobDescriptionInput({ onSubmit, onBack }) {
    const [jobDescription, setJobDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (jobDescription.trim().length < 50) {
            alert('Please provide a more detailed job description (at least 50 characters)');
            return;
        }
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        onSubmit(jobDescription);
        setIsLoading(false);
    };
    const exampleJobs = [
        'Senior React Developer - 5+ years experience with TypeScript',
        'Full Stack Engineer - Node.js and React, AWS deployment experience',
        'Product Manager - B2B SaaS background required',
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-8", children: [_jsx("button", { onClick: onBack, className: "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors", children: _jsx(ArrowLeft, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsx("h2", { className: "section-title", children: "Paste Job Description" }), _jsx("p", { className: "section-subtitle mt-1", children: "Provide the job you're applying for" })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "job-desc", className: "block text-sm font-medium mb-3", children: "Job Description" }), _jsx("textarea", { id: "job-desc", value: jobDescription, onChange: (e) => setJobDescription(e.target.value), placeholder: "Paste the job posting here. Include title, requirements, responsibilities, and nice-to-have skills...", className: "input-field min-h-64 resize-none" }), _jsxs("div", { className: "mt-2 flex items-center justify-between", children: [_jsxs("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary", children: [jobDescription.length, " characters"] }), jobDescription.length < 50 && (_jsx("p", { className: "text-xs text-orange-600 dark:text-orange-400", children: "Minimum 50 characters required" }))] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-3", children: [_jsx("p", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Quick Examples:" }), exampleJobs.map((example, index) => (_jsx("button", { type: "button", onClick: () => setJobDescription(example), className: "text-left p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card transition-colors", children: _jsx("p", { className: "text-sm font-medium", children: example }) }, index)))] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx("button", { type: "button", onClick: onBack, className: "btn-secondary flex-1", children: "Back" }), _jsxs("button", { type: "submit", disabled: isLoading || jobDescription.length < 50, className: "btn-primary flex-1 flex items-center justify-center gap-2", children: [_jsx(Zap, { className: "w-4 h-4" }), isLoading ? 'Analyzing...' : 'Analyze Match'] })] })] })] }));
}
