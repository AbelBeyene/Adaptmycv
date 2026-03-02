# AdaptMyCV

Tailor your resume instantly for any job opportunity. AdaptMyCV uses AI-powered analysis to match your resume against job descriptions and provides actionable recommendations to improve your chances of landing interviews.

## Features

- **Resume Upload**: Support for PDF and Word documents
- **Job Description Analysis**: Paste any job posting for automated analysis
- **Match Scoring**: Get a percentage match score showing how well your resume aligns
- **Skill Matching**: See which skills match and which ones are missing
- **Smart Recommendations**: Get actionable tips to improve your resume for the specific job
- **Dark/Light Theme**: Better-auth inspired minimal design with full theme support
- **ATS Optimization**: Ensure your resume works with Applicant Tracking Systems

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (with better-auth inspired theme)
- **Icons**: Lucide React
- **Utilities**: clsx, class-variance-authority, tailwind-merge

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── ResumeUploader.tsx      # Resume upload component
│   ├── JobDescriptionInput.tsx # Job description input
│   └── AnalysisResults.tsx     # Results and recommendations
├── App.tsx                      # Main App component
├── main.tsx                     # Entry point
└── index.css                    # Global styles
```

## Styling

The project uses Tailwind CSS with a minimalist design inspired by better-auth:

- Clean, modern UI with smooth transitions
- Dark and light theme support
- Custom color palette optimized for both themes
- Component-level styling utilities in `index.css`

## Features Coming Soon

- AI-powered resume rewriting suggestions
- Cover letter optimization
- Job search integration
- Multi-language support
- Export optimized resume as PDF
- History of analyzed jobs

## License

MIT

---

Built with ❤️ to help you land your next opportunity.
