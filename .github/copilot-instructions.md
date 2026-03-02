<!-- Project-specific instructions for GitHub Copilot -->

## AdaptMyCV Project Setup

This is a React TypeScript application for resume optimization. The project uses:
- **Vite** for fast development and building
- **React 18** for UI components
- **TypeScript** for type safety
- **Tailwind CSS** for styling (with better-auth inspired theme)
- **Lucide React** for icons

## Key Features Implemented

1. **Resume Upload** - Drag-and-drop or click to upload PDF/DOCX files
2. **Job Description Input** - Paste job postings for analysis
3. **Analysis Results** - Shows match score, skill gaps, and recommendations
4. **Theme Switching** - Dark/light mode toggle inspired by better-auth design
5. **Responsive Design** - Mobile-first approach with Tailwind CSS

## Component Structure

- `ResumeUploader.tsx` - Handles resume file uploads
- `JobDescriptionInput.tsx` - Job description input with examples
- `AnalysisResults.tsx` - Displays matching analysis and recommendations
- `App.tsx` - Main application component with routing/step management

## Styling Notes

- Uses Tailwind CSS with custom theme configuration
- Dark mode support with `dark:` variant
- Custom utilities and components defined in `src/index.css`
- Better-auth inspired color palette for modern, minimal aesthetic

## Environment Setup

- Node.js 24+ installed via Homebrew
- npm dependencies installed in `/Users/abel/Documents/Projects/Adaptmycv/node_modules`
- Dev server running on http://localhost:5173

## Development Workflow

1. Run `npm run dev` to start development server
2. Edit components in `src/` directory
3. Styling changes in `src/index.css` or Tailwind classes
4. Run `npm run build` for production build
5. Type checking with TypeScript automatically

## Future Enhancements

- Integration with OpenAI API for real resume analysis
- PDF parsing for actual resume content extraction
- Export functionality for optimized resumes
- Save/load analysis history
- Enhanced recommendation engine
