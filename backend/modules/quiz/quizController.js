const axios = require('axios');
const { CachedGeneralQuiz } = require('./models');

const extractJson = (text) => {
  const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
};

const generateQuiz = async (req, res) => {
  const { subject, topic, numQuestions } = req.body;
  
  // --- Rule: Question Limit (10 or 20 only) ---
  const requestedNum = parseInt(numQuestions, 10);
  const finalNumQuestions = (requestedNum === 20) ? 20 : 10; // Defaults to 10 if not 20

  const finalSubject = subject || 'Homeopathy PG';
  const finalTopic = topic || 'General Knowledge';

  if (!subject || !topic) {
    return res.status(200).json({ message: 'Please provide both a Subject and a Topic.', retry: true });
  }

  try {
    // --- Step A: Check for Existing Set (Topic + Count Caching) ---
    const cachedEntry = await CachedGeneralQuiz.findOne({ 
      subject: finalSubject, 
      topic: finalTopic, 
      numQuestions: finalNumQuestions 
    });
    
    if (cachedEntry && cachedEntry.questions && cachedEntry.questions.length >= finalNumQuestions) {
      console.log(`✅ [Cache Hit] Serving ${finalNumQuestions} questions for: ${finalTopic}`);
      return res.status(200).json(cachedEntry.questions);
    }

    // --- Step C: Generate via AI (If NOT FOUND) ---
    console.log(`🚀 [Cache Miss] Generating ${finalNumQuestions} questions via AI: ${finalTopic}`);
    
    const prompt = `Return ONLY a JSON array of ${finalNumQuestions} clinical MCQs for Homeopathy PG. Subject: ${finalSubject}, Topic: ${finalTopic}. Each object must have: question, options (array of 4), correctAnswer (index 0-3), and explanation. NO markdown, NO extra text.`;

    const geminiResponse = await axios.post(
      process.env.GEMINI_API_URL,
      {        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
      }
    );

    const responseText = geminiResponse.data.candidates[0].content.parts[0].text;
    const quizData = extractJson(responseText);

    if (quizData && Array.isArray(quizData) && quizData.length >= finalNumQuestions) {
      const finalQuestions = quizData.slice(0, finalNumQuestions);

      // --- SAVE to CachedGeneralQuizzes ---
      try {
        await CachedGeneralQuiz.findOneAndUpdate(
          { subject: finalSubject, topic: finalTopic, numQuestions: finalNumQuestions },
          { 
            $set: { 
              questions: finalQuestions,
              createdAt: new Date()
            } 
          },
          { upsert: true, new: true }
        );
        console.log(`💾 Saved ${finalNumQuestions} questions to cache for ${finalTopic}.`);
      } catch (saveErr) {
        console.error('Error caching quiz:', saveErr.message);
      }

      res.status(200).json(finalQuestions);
    } else {
      console.error('AI Response Validation Failed.');
      return res.status(200).json({ message: 'Failed to generate quiz. Please try again.', retry: true });
    }
  } catch (error) {
    console.error('Quiz Error:', error.message);
    return res.status(200).json({ message: 'AI service busy. Please try again.', retry: true });
  }
};

module.exports = { generateQuiz };
