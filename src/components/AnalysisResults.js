import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Download, RefreshCw, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { analyzeResumeJobMatch } from '../services/openrouter';
export default function AnalysisResults({ resumeText, jobDescription, onReset }) {
    const [analysis, setAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const runAnalysis = async () => {
            try {
                setIsAnalyzing(true);
                setError(null);
                const result = await analyzeResumeJobMatch(resumeText, jobDescription);
                setAnalysis(result);
            }
            catch (err) {
                console.error('Analysis failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to analyze resume');
            }
            finally {
                setIsAnalyzing(false);
            }
        };
        runAnalysis();
    }, [resumeText, jobDescription]);
    if (isAnalyzing) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "section-title", children: "Analyzing Your Resume..." }), _jsx("div", { className: "card", children: _jsx("div", { className: "space-y-4", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-12 bg-gray-200 dark:bg-dark-border rounded-lg animate-pulse" }, i))) }) })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "section-title", children: "Analysis Error" }), _jsx("div", { className: "card border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20", children: _jsxs("div", { className: "flex gap-3", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-red-900 dark:text-red-200", children: "Failed to analyze resume" }), _jsx("p", { className: "text-sm text-red-800 dark:text-red-300 mt-1", children: error })] })] }) }), _jsx("button", { onClick: onReset, className: "btn-primary", children: "Try Again" })] }));
    }
    if (!analysis) {
        return (_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "section-title", children: "No Analysis Available" }), _jsx("button", { onClick: onReset, className: "btn-primary", children: "Start Over" })] }));
    }
    return (_jsxs("div", { className: "space-y-8", children: [_jsxs("div", { children: [_jsx("h2", { className: "section-title mb-6", children: "Resume Analysis" }), _jsx("div", { className: "card", children: _jsxs("div", { className: "flex items-center justify-between flex-col sm:flex-row gap-8", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-2", children: "Match Score" }), _jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: "text-5xl font-bold text-gray-900 dark:text-white", children: [analysis.matchScore, "%"] }), _jsx("span", { className: "text-gray-600 dark:text-dark-text-secondary", children: "match" })] }), _jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary mt-3", children: "Your resume aligns well with the job requirements" })] }), _jsxs("div", { className: "w-40 h-40 rounded-full border-8 border-gray-200 dark:border-dark-border flex items-center justify-center relative", children: [_jsx("div", { className: "absolute inset-0 rounded-full border-8 border-black dark:border-white", style: {
                                                clipPath: `conic-gradient(black ${analysis.matchScore}%, transparent ${analysis.matchScore}%)`,
                                            } }), _jsx("div", { className: "relative w-32 h-32 rounded-full bg-white dark:bg-dark-card flex items-center justify-center", children: _jsxs("span", { className: "text-3xl font-bold text-gray-900 dark:text-white", children: [analysis.matchScore, "%"] }) })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(CheckCircle2, { className: "w-5 h-5 text-green-600 dark:text-green-400" }), _jsx("h3", { className: "font-semibold text-gray-900 dark:text-white", children: "Matched Skills" })] }), _jsx("div", { className: "space-y-2", children: analysis.hardSkillsMatch.map((skill) => (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-green-600 dark:bg-green-400" }), _jsx("span", { children: skill })] }, skill))) }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-dark-border", children: [_jsx("p", { className: "text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-2", children: "Soft Skills" }), _jsx("div", { className: "flex flex-wrap gap-2", children: analysis.softSkillsMatch.map((skill) => (_jsx("span", { className: "badge", children: skill }, skill))) })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-orange-600 dark:text-orange-400" }), _jsx("h3", { className: "font-semibold text-gray-900 dark:text-white", children: "Missing Skills" })] }), _jsx("div", { className: "space-y-2", children: analysis.missingSkills.map((skill) => (_jsxs("div", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-white opacity-75 dark:opacity-100", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400" }), _jsx("span", { children: skill })] }, skill))) }), _jsx("p", { className: "text-xs text-gray-600 dark:text-dark-text-secondary mt-4 pt-4 border-t border-gray-200 dark:border-dark-border", children: "Consider adding experience with these technologies if you have any" })] })] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(TrendingUp, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }), _jsx("h3", { className: "font-semibold text-gray-900 dark:text-white", children: "Recommendations to Improve Match" })] }), _jsx("div", { className: "space-y-3", children: analysis.recommendations.map((rec, index) => (_jsx("div", { className: "p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50", children: _jsxs("p", { className: "text-sm text-blue-900 dark:text-blue-200", children: [_jsxs("span", { className: "font-semibold", children: ["Tip ", index + 1, ":"] }), " ", rec] }) }, index))) })] }), _jsxs("div", { className: "card bg-gray-50 dark:bg-dark-border/50", children: [_jsx("h3", { className: "font-semibold mb-3 text-gray-900 dark:text-white", children: "Job Description" }), _jsx("p", { className: "text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-3", children: jobDescription })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: () => window.print(), className: "btn-secondary flex-1 flex items-center justify-center gap-2", children: [_jsx(Download, { className: "w-4 h-4" }), "Download Report"] }), _jsxs("button", { onClick: onReset, className: "btn-primary flex-1 flex items-center justify-center gap-2", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), "Analyze Another Job"] })] })] }));
}
