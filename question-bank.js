/*
  VERIFIED QUESTION BANK
  ----------------------
  This array intentionally starts empty. Add only questions transcribed from a
  trustworthy original paper or reliable source. Never invent an exam year,
  question wording, options, answer or explanation.

  Record format:
  {
    category: 'BCS' | 'Bank' | 'Govt',
    year: 2010..2026,
    examName: 'Exact exam and stage/post name',
    subject: 'Subject name',
    question: 'Exact question text',
    options: ['Option exactly as printed', ...], // [] when the original had no options
    correctIndex: 0, // use null when answer is not verified
    answerText: '',  // optional short verified answer for non-MCQ questions
    explanation: '', // leave blank when no reliable explanation is available
    sourceName: 'Paper/source title or issuing institution',
    sourceUrl: 'https://...' // optional; use only a verified URL
  }

  Keep the original number and structure of options. Do not add options to
  written questions. If a source does not confirm the correct answer, leave
  correctIndex as null and answerText blank.
*/
window.VERIFIED_QUESTIONS = [];
