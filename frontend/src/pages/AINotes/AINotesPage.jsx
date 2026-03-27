import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { FaBook, FaSearch, FaLightbulb, FaFileAlt, FaFolderOpen } from 'react-icons/fa';

const subjects = [
  { id: 'MATERIAMEDICA', name: 'Materia Medica', icon: '🌿', type: 'local', dbTitle: 'borick hmm' },
  { id: 'ANATOMY', name: 'Anatomy', icon: '🦴', type: 'ai', reference: 'BD Chaurasia' },
  { id: 'BIOCHEMISTRY', name: 'Biochemistry', icon: '🧪', type: 'ai', reference: 'Satyanarayana' },
  { id: 'FMT', name: 'FMT', icon: '⚖️', type: 'ai', reference: 'Reddy' },
  { id: 'OBG', name: 'OBG', icon: '👶', type: 'ai', reference: 'Dutta' },
  { id: 'ORGANON', name: 'Organon of Medicine', icon: '📜', type: 'local', dbTitle: 'organon' },
  { id: 'SURGERY', name: 'Surgery', icon: '✂️', type: 'ai', reference: 'Bailey & Love' },
  { id: 'PRACTICEOFMEDICINE', name: 'Practice of Medicine', icon: '🏥', type: 'ai', reference: 'Davidson' },
  { id: 'PATHOLOGY', name: 'Pathology', icon: '🧫', type: 'ai', reference: 'Harsh Mohan' },
  { id: 'MICROBIOLOGY', name: 'Microbiology', icon: '🔬', type: 'ai', reference: 'KD Chatterjee' },
  { id: 'PHARMACY', name: 'Pharmacy', icon: '💊', type: 'ai', reference: 'Mandal & Mandal' },
  { id: 'PHYSIOLOGY', name: 'Physiology', icon: '🫀', type: 'ai', reference: 'Guyton' },
  { id: 'REPERTORY', name: 'Repertory', icon: '🔍', type: 'local', dbTitle: 'repertory' },
].sort((a, b) => a.name.localeCompare(b.name));

function AINotesPage() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [topic, setTopic] = useState('');
  const [marks, setMarks] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateNotes = async () => {
    if (!selectedSubject || !topic) {
      alert('Please select all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setNotes('');

    try {
      let bookIds = [];
      if (selectedSubject.type === 'local') {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/books`);
        const allBooks = await response.json();
        const book = allBooks.find(b => b.title.toLowerCase().includes(selectedSubject.dbTitle.toLowerCase()));
        if (book) bookIds = [book._id];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject.id,
          topic: topic,
          marks: marks,
          subjectType: selectedSubject.type,
          bookIds: bookIds,
          aiReference: selectedSubject.reference
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok) {
        setNotes(data.notes);
      } else {
        throw new Error(data.message || "Failed to generate notes");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FaBook className="text-indigo-600" /> AI Notes Generator
          </h2>
          <p className="text-slate-500 font-medium">Create high-yield clinical notes for your PG exams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Selection Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[32px] shadow-xl border border-slate-100 space-y-6">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Select Subject</label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${selectedSubject?.id === sub.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100' : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="text-[10px] font-black uppercase text-center">{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">Topic Name</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text"
                  placeholder="e.g. Aphorism 1, Arsenicum..."
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Marks Selection</label>
              <div className="flex gap-4">
                {[5, 10].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMarks(m)}
                    className={`flex-1 py-3 rounded-2xl font-black transition-all border-2 ${marks === m ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                  >
                    {m} Marks
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateNotes}
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <FaLightbulb /> {loading ? "Generating..." : "Generate Notes"}
            </button>
          </div>
        </div>

        {/* Notes Display */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 min-h-[600px] flex flex-col overflow-hidden">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FaFileAlt />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Study Material</h3>
                  <p className="text-[10px] font-bold text-slate-400">{selectedSubject ? `${selectedSubject.name} • ${topic || 'Select Topic'}` : 'Waiting for input...'}</p>
                </div>
              </div>
              <span className="px-4 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{marks} Marks Mode</span>
            </div>

            <div className="p-10 flex-grow overflow-y-auto max-h-[700px] bg-white scrollbar-hide">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
                  <p className="font-black text-slate-400 animate-pulse uppercase tracking-widest text-xs">Consulting Digital Library...</p>
                </div>
              ) : notes ? (
                <React.Fragment>
                  <h1 style={{ color: '#d32f2f', fontSize: '48px', fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', marginBottom: '20px', borderBottom: '3px solid #d32f2f', paddingBottom: '10px' }}>{topic}</h1>
                  <div className="prose prose-slate max-w-none" style={{ whiteSpace: 'pre-wrap' }}>
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: ({node, ...props}) => <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'red', marginBottom: '12px' }} {...props} />,
                        h2: ({node, ...props}) => <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: 'blue', textTransform: 'uppercase', marginBottom: '12px' }} {...props} />,
                        h3: ({node, ...props}) => <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'green', marginBottom: '12px' }} {...props} />,
                        p: ({node, ...props}) => <p style={{ fontSize: '16px', fontWeight: '300', color: 'black', marginBottom: '12px' }} {...props} />,
                        li: ({node, ...props}) => <li style={{ fontSize: '16px', fontWeight: '300', color: 'black', marginBottom: '12px' }} {...props} />,
                        strong: ({node, ...props}) => <strong style={{ fontWeight: 'bold' }} {...props} />,
                      }}
                    >
                      {notes}
                    </ReactMarkdown>
                  </div>
                </React.Fragment>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <FaFolderOpen className="text-6xl text-slate-200" />
                  <p className="font-bold text-slate-400">Select a subject and topic to begin generating high-yield study notes.</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 font-bold text-center border-t border-red-100">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AINotesPage;

