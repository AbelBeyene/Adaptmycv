import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Target, Moon, Sun } from 'lucide-react';
import ResumUploader from './components/ResumeUploader';
import JobDescriptionInput from './components/JobDescriptionInput';
import AnalysisResults from './components/AnalysisResults';
import { extractResumeText } from './services/gemini';
import './App.css';
function App() {
    const [currentStep, setCurrentStep] = useState('upload');
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeText, setResumeText] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [isDark, setIsDark] = useState(true);
    const handleResumeUpload = async (file) => {
        setResumeFile(file);
        // Extract text from resume file
        const text = await extractResumeText(file);
        setResumeText(text);
        setCurrentStep('job');
    };
    const handleJobSubmit = (text) => {
        setJobDescription(text);
        setCurrentStep('results');
    };
    const handleReset = () => {
        setCurrentStep('upload');
        setResumeFile(null);
        setJobDescription('');
    };
    return (_jsx("div", { className: isDark ? 'dark' : '', children: _jsxs("div", { className: "min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-dark-bg dark:to-dark-card transition-colors duration-200", children: [_jsx("header", { className: "sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-dark-bg/80 border-b border-gray-200 dark:border-dark-border", children: _jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 rounded-lg bg-black dark:bg-white flex items-center justify-center", children: _jsx(Target, { className: "w-6 h-6 text-white dark:text-black" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "AdaptMyCV" }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary", children: "Tailor your resume instantly" })] })] }), _jsx("button", { onClick: () => setIsDark(!isDark), className: "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors", "aria-label": "Toggle theme", children: isDark ? (_jsx(Sun, { className: "w-5 h-5 text-gray-600 dark:text-dark-text-secondary" })) : (_jsx(Moon, { className: "w-5 h-5 text-gray-600 dark:text-dark-text-secondary" })) })] }) }), _jsxs("main", { className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12", children: [_jsxs("div", { className: "mb-12", children: [_jsx("div", { className: "flex items-center justify-between", children: ['upload', 'job', 'results'].map((step, index) => (_jsxs("div", { className: "flex items-center flex-1", children: [_jsx("div", { className: `w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep === step || index < ['upload', 'job', 'results'].indexOf(currentStep)
                                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                                    : 'bg-gray-200 dark:bg-dark-card text-gray-600 dark:text-dark-text-secondary'}`, children: index + 1 }), index < 2 && (_jsx("div", { className: `flex-1 h-1 mx-2 transition-all ${index < ['upload', 'job', 'results'].indexOf(currentStep)
                                                    ? 'bg-black dark:bg-white'
                                                    : 'bg-gray-200 dark:bg-dark-border'}` }))] }, step))) }), _jsxs("div", { className: "mt-4 flex justify-between text-sm text-gray-600 dark:text-dark-text-secondary", children: [_jsx("span", { children: "Upload Resume" }), _jsx("span", { children: "Job Description" }), _jsx("span", { children: "Analysis" })] })] }), _jsxs("div", { className: "slide-in", children: [currentStep === 'upload' && (_jsx(ResumUploader, { onUpload: handleResumeUpload })), currentStep === 'job' && (_jsx(JobDescriptionInput, { onSubmit: handleJobSubmit, onBack: () => setCurrentStep('upload') })), currentStep === 'results' && resumeFile && jobDescription && (_jsx(AnalysisResults, { resumeText: resumeText, jobDescription: jobDescription, onReset: handleReset }))] })] }), _jsx("footer", { className: "border-t border-gray-200 dark:border-dark-border mt-12", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-600 dark:text-dark-text-secondary", children: _jsx("p", { children: "AdaptMyCV \u00A9 2026 - Optimize your resume for every opportunity" }) }) })] }) }));
}
export default App;
