import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function AINotesPage() {
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTopic, setSearchTopic] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Define the hybrid strategy subjects and their AI references
  const hybridSubjects = [
    { id: 'hmm_local', title: 'Boricke Repertory (Local)', type: 'local', dbTitle: 'hmm' },
    { id: 'spm_ai', title: 'SPM (Park - AI Knowledge)', type: 'ai', reference: "Park's SPM" },
    { id: 'microbiology_ai', title: 'Microbiology (Ananthanarayan - AI Knowledge)', type: 'ai', reference: "Ananthanarayan (Microbiology)" },
    { id: 'parasitology_ai', title: 'Parasitology (KD Chatterjee - AI Knowledge)', type: 'ai', reference: "KD Chatterjee (Parasitology)" },
    { id: 'osteology_ai', title: 'Osteology (BD Chaurasia - AI Knowledge)', type: 'ai', reference: "BD Chaurasia (Osteology)" },
    { id: 'ent_ai', title: 'ENT (Dhingra - AI Knowledge)', type: 'ai', reference: "Dhingra (ENT)" },
  ];

  useEffect(() => {
    const fetchAndSetSubjects = async () => {
      // For now, populate subjects from the hardcoded list
      // In a real app, 'local' books might still be fetched from DB to ensure they exist
      setAvailableSubjects(hybridSubjects);
    };

    fetchAndSetSubjects();
  }, []);

  const handleSubjectSelect = (e) => {
    setSelectedSubject(e.target.value);
  };

  const generateNotes = async () => {
    setLoading(true);
    setError(null);
    setNotes(''); // Clear previous notes

    const selectedSubjectData = hybridSubjects.find(sub => sub.id === selectedSubject);
    if (!selectedSubjectData) {
      setError('Please select a valid subject.');
      setLoading(false);
      return;
    }

    // Assume 5 marks for now, can be made dynamic later
    const marks = 5; // Hardcode for testing 5-mark rules

    let requestBody = {
      subject: selectedSubjectData.title.split(' ')[0], // Extract 'Anatomy' from 'Osteology (BD Chaurasia - AI Knowledge)'
      topic: searchTopic || 'stomach', // Default to 'stomach' for testing
      marks: marks,
      subjectType: selectedSubjectData.type,
      aiReference: selectedSubjectData.reference,
    };

    // If it's a local book, we need its actual MongoDB ID
    if (selectedSubjectData.type === 'local' && selectedSubjectData.dbTitle) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/books`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allBooks = await response.json();
        const localBook = allBooks.find(book => book.title.toLowerCase() === selectedSubjectData.dbTitle.toLowerCase());
        if (localBook) {
          requestBody.bookIds = [localBook._id];
        } else {
          setError(`Local book '${selectedSubjectData.dbTitle}' not found in database. AI will be used instead.`);
          requestBody.subjectType = 'ai'; // Force AI if local book not found
          requestBody.aiReference = selectedSubjectData.reference || "general homeopathy knowledge base";
        }
      } catch (bookFetchError) {
        console.error("Error fetching local book for AI Notes:", bookFetchError);
        setError(`Failed to retrieve local book data: ${bookFetchError.message}. AI will be used instead.`);
        requestBody.subjectType = 'ai'; // Force AI if fetching local book fails
        requestBody.aiReference = selectedSubjectData.reference || "general homeopathy knowledge base";
      }
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNotes(data.notes);
    } catch (err) {
      console.error('Error generating notes:', err);
      setError(`Failed to generate notes: ${err.message}`);
      setNotes('Error generating notes.');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    if (selectedSubject) {
      // Navigate to QuizPage, passing the selected subject for quiz generation
      navigate(`/quiz/${selectedSubject}`);
    } else {
      setError('Please select a subject to start a quiz.');
    }
  };

  // Function to get border color based on subject
  const getSubjectBorderColor = (subjectId) => {
    switch (subjectId) {
      case 'osteology_ai':
        return 'border-blue-500'; // Deep Blue for Anatomy
      // Add more cases for other subjects if needed
      default:
        return 'border-gray-300'; // Default border color
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-primary mb-4">Study Center Dashboard</h2>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-3">Select Subject</h3>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {
          availableSubjects.length > 0 ? (
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedSubject}
              onChange={handleSubjectSelect}
            >
              <option value="">-- Select a Subject --</option>
              {availableSubjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.title}
                </option>
              ))}
            </select>
          ) : (
            <p>No subjects available.</p>
          )
        }

        <h3 className="text-xl font-semibold mb-3 mt-6">Search Topic (Optional)</h3>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g., Arsenicum Album, Materia Medica, Aetiology"
          value={searchTopic}
          onChange={(e) => setSearchTopic(e.target.value)}
        />

        <h3 className="text-xl font-semibold mb-3 mt-6">Your Prompt (Optional)</h3>
        <textarea
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary h-32"
          placeholder="e.g., Summarize the key remedies for fever, or explain the concept of miasms."
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
        ></textarea>

        <div className="mt-4 flex space-x-4">
          <button
            onClick={generateNotes}
            disabled={!selectedSubject || loading}
            className={`px-6 py-2 rounded-md text-white font-semibold transition-colors
              ${!selectedSubject || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
          >
            {loading ? 'Generating Notes...' : 'Generate Notes with AI Mentor'}
          </button>
          <button
            onClick={startQuiz}
            disabled={!selectedSubject}
            className={`px-6 py-2 rounded-md text-white font-semibold transition-colors
              ${!selectedSubject ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            Start Quiz
          </button>
        </div>
      </div>

      <div className={`bg-white p-6 rounded-lg shadow-md mt-6 ${getSubjectBorderColor(selectedSubject)} border-l-4`}>
        <h3 className="text-xl font-semibold mb-3">AI-Generated Study Notes</h3>
        <div className="bg-gray-100 p-4 rounded-md min-h-[200px] prose">
          {loading ? (
            'Consulting Digital Library...'
          ) : notes ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
          ) : (
            "Your AI-generated notes will appear here."
          )}
        </div>
      </div>
    </div>
  );
}

export default AINotesPage;

