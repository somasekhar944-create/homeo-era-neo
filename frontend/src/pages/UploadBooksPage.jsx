import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';

function UploadBooksPage() {
  const [title, setTitle] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null); // 'success', 'error', or null
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Uploads are temporarily disabled. Please refer to the AI Knowledge Base.');
    setMessageType('error');
    setUploading(false);
    return; // Immediately return, disabling upload functionality

    // Original upload logic (commented out to disable uploads)
    /*
    setMessage('');
    setMessageType(null);
    setUploadProgress(0); // Reset progress on new submission
    setProcessingMessage(''); // Clear processing message on new submission
    setUploading(true);

    if (!title || !pdfFile) {
      setMessage('Please enter a Book/Topic Name and select a PDF file.');
      setMessageType('error');
      setUploading(false);
      return;
    }

    try {
      setProcessingMessage("Preparing PDF for upload...");

      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      const chunkSize = 1; // Pages per chunk (1) per chunk
      const numChunks = Math.ceil(totalPages / chunkSize);

      let pagesProcessed = 0;

      for (let i = 0; i < numChunks; i++) {
        const startPage = i * chunkSize;
        const endPage = Math.min(startPage + chunkSize, totalPages);

        const chunkPdfDoc = await PDFDocument.create();
        const copiedPages = await chunkPdfDoc.copyPages(pdfDoc, Array.from({ length: endPage - startPage }, (_, k) => startPage + k));
        copiedPages.forEach((page) => chunkPdfDoc.addPage(page));

        const chunkPdfBytes = await chunkPdfDoc.save();
        const chunkBlob = new Blob([chunkPdfBytes], { type: 'application/pdf' });

        const formData = new FormData();
        formData.append('title', title);
        formData.append('pdfChunk', chunkBlob, `chunk_${i + 1}.pdf`);
        formData.append('chunkIndex', i);
        formData.append('totalPages', totalPages);
        formData.append('startPage', startPage);
        formData.append('endPage', endPage - 1);

        setProcessingMessage(`Processing Chunk ${i + 1} of ${numChunks} (Pages ${startPage + 1}-${endPage})...`);
        setUploadProgress(Math.round(((i + 1) / numChunks) * 100));

        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/books/upload-chunk`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'X-Admin-Token': 'your_admin_secret_key', // TODO: Replace with a secure way to handle admin token
            },
          });

          if (response.status !== 200) {
            console.error(`Error processing chunk ${i + 1}:`, response.data.message);
            setMessage(`Error processing chunk ${i + 1}: ${response.data.message || 'Something went wrong.'}`);
            setMessageType('error');
          }
        } catch (chunkError) {
          console.error(`Network error or backend issue for chunk ${i + 1}:`, chunkError);
          setMessage(`Error with chunk ${i + 1}: ${chunkError.message}`);
          setMessageType('error');
        }
        pagesProcessed += (endPage - startPage);
      }

      setMessage('✅ Book Indexed Successfully!');
      setMessageType('success');
      setTitle('');
      setPdfFile(null);
      setUploadProgress(0); // Reset progress
      setProcessingMessage(''); // Clear processing message
      e.target.reset();

    } catch (error) {
      console.error('Upload process error:', error);
      if (axios.isAxiosError(error) && error.response && error.response.status === 400) {
        setMessage('⚠️ Scanned PDF Detected: This file only contains images. Please upload a digital text version so the AI can read it.');
      } else {
        setMessage(`Overall upload failed: ${error.message}`);
      }
      setMessageType('error');
      setUploadProgress(0); // Reset progress
      setProcessingMessage(''); // Clear processing message
    } finally {
      setUploading(false);
    }
    */
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-primary mb-4">Upload Books to Internal Knowledge Base</h2>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Book/Topic Name</label>
            <input
              type="text"
              id="title"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={true} // Temporarily disable input
            />
          </div>

          <div>
            <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700">Upload PDF File</label>
            <div className="mt-1">
              <input
                type="file"
                id="pdfFile"
                accept=".pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary-lighter"
                onChange={handleFileChange}
                required
                disabled={true} // Temporarily disable input
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#007bff] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={true} // Temporarily disable button
            >
              Uploads Disabled
            </button>
          </div>

          {uploading && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
          {message && (
            <p className={`mt-4 text-sm text-center font-medium ${messageType === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default UploadBooksPage;

