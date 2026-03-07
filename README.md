# AdaptMyCV

Tailor your resume instantly for any job opportunity. AdaptMyCV uses **Google's Gemini AI** to analyze your resume against job descriptions and provides actionable recommendations to improve your chances of landing interviews.

## Features

- **Resume Upload** - Support for PDF and Word documents
- **Job Description Analysis** - Paste any job posting for automated analysis
- **AI-Powered Matching** - Uses Gemini Flash API for intelligent resume-to-job matching
- **Match Scoring** - Get a percentage match score showing how well your resume aligns
- **Skill Matching** - See which hard skills, soft skills match and which ones are missing
- **Smart Recommendations** - Get actionable tips to improve your resume for the specific job
- **Dark/Light Theme** - Better-auth inspired minimal design with full theme support
- **ATS Optimization** - Ensure your resume works with Applicant Tracking Systems

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (with better-auth inspired theme)
- **Icons**: Lucide React
- **AI**: Google Gemini Flash API
- **Utilities**: clsx, class-variance-authority, tailwind-merge

## Getting Started

### Prerequisites

- Node.js 24+
- Google Gemini API Key

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the project root with your Gemini API credentials:

```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

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
│   ├── ResumeUploader.tsx      # Resume upload component with drag-drop
│   ├── JobDescriptionInput.tsx # Job description input with examples
│   └── AnalysisResults.tsx     # Results and AI-powered recommendations
├── services/
│   └── gemini.ts              # Gemini API integration
├── App.tsx                      # Main App component
├── main.tsx                     # Entry point
└── index.css                    # Global styles with Tailwind
```

## API Integration

The app uses Google's Gemini Flash API for resume analysis. The `services/gemini.ts` module handles:

1. **Resume Text Extraction** - Processes uploaded PDF/DOCX files
2. **Job Matching Analysis** - Compares resume content with job description
3. **Skill Gap Analysis** - Identifies matching and missing skills
4. **Recommendations** - Generates personalized improvement suggestions

### API Response Format

```json
{
  "matchScore": 72,
  "hardSkillsMatch": ["React", "TypeScript", "Node.js"],
  "softSkillsMatch": ["Problem Solving", "Team Collaboration"],
  "missingSkills": ["Kubernetes", "AWS API Gateway"],
  "recommendations": [
    "Highlight Docker experience more prominently",
    "Add AWS projects to experience section"
  ]
}
```

## Styling

The project uses Tailwind CSS with a minimalist design 

- Clean, modern UI with smooth transitions
- Dark and light theme support
- Custom color palette optimized for both themes
- Component-level styling utilities in `src/index.css`

## Environmental Variables

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key |
| `VITE_GEMINI_API_URL` | Gemini API endpoint URL |

## Features Coming Soon

- 📄 **PDF Parsing** - Full resume content extraction using pdf-parse
- 📝 **Resume Rewriting** - AI-powered suggestions for resume sentences
- 📧 **Cover Letter Optimization** - Analyze and optimize cover letters
- 🌍 **Multi-Language Support** - Support for multiple languages
- 💾 **Job History** - Save and compare analyzed jobs
- 📊 **Analytics Dashboard** - Track your resume optimization progress
- 🔗 **Job Board Integration** - Direct integration with job websites

## License

MIT

---

Built with ❤️ to help you land your next opportunity.

## Troubleshooting

### API Key Issues
- Verify your API key is correctly set in `.env.local`
- Ensure the API key has the necessary permissions in Google Cloud Console
- Check that quotas and billing are enabled for your project

### Analysis Errors
- Ensure job description is at least 50 characters
- Resume file should be less than 10MB
- Supported formats: PDF, DOCX, DOC

### Performance
- The first analysis may take 2-3 seconds as Gemini processes the request
- Subsequent analyses are generally faster due to caching

## Support

For issues or feature requests, please open an issue in the repository.
abelbeyene.dev