const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const NoteCache = require("../../models/NoteCache");

const MM_SOURCE_FILE = "borick hmm";

exports.generateNotes = async (req, res) => {
    console.log("Request reached the controller for:", req.body.topic);

    const { subject, topic, marks } = req.body;
    const normalizedSubject = subject.trim().toUpperCase();
    const normalizedTopic = topic.trim().toUpperCase();

    if (!subject || !topic) {
        return res.status(400).json({ error: "Subject and Topic are required", received: req.body });
    }

    try {
        console.log("1. Starting Request for:", { subject: normalizedSubject, topic: normalizedTopic, marks });

        // Database Cache Check First
        let cachedNote = null;
        try {
            console.log("Attempting to retrieve from cache for topic:", normalizedTopic);
            cachedNote = await NoteCache.findOne({ subject: normalizedSubject, topic: normalizedTopic, marks });

            if (cachedNote) {
                console.log("CACHE HIT: Serving cached data for:", normalizedTopic);
                return res.status(200).json({ notes: cachedNote.content });
            }
            console.log("CACHE MISS: Cache not found. Calling Gemini 2.0 Flash...");
        } catch (cacheError) {
            console.error("Cache lookup error:", cacheError.message);
        }
        
        console.log("2. Cache check finished. Calling Gemini...");

        let systemPrompt;
        let finalResponseStructure = `${topic} - ${marks} Marks\n\n`;

        switch (normalizedSubject) { // Use normalizedSubject for case matching
            case 'MATERIAMEDICA':
                systemPrompt = `
                    ***STRICT MATERIA MEDICA RULES (EXAM-TOPPER STYLE):***
                    Return ONLY a JSON array of objects. Each object must have:
                    "title": "Section Title (e.g., DRUG PROFILE, MNEMONIC, etc.)",
                    "content": "Markdown content for this section"

                    1. **SOURCE LOCK:** Strictly use information ONLY from the '${MM_SOURCE_FILE}' Materia Medica for all queries.
                    2. **TEMPLATE LOCK:** Every note MUST strictly follow this order:
                       - **I. DRUG PROFILE:** (Synonyms, Family, Sphere, Thermal, Miasm)
                       - **II. MNEMONIC:** (A concise and relevant catchy code)
                       - **III. KEY INDICATIONS:** (Bullet points only)
                       - **IV. MODALITIES:** (Aggravation, Amelioration - one line each)
                       - **V. RELATIONS & COMPARISONS:** (Bullet points only, NO TABLES)
                    3. **ZERO ANATOMY:** You are STRICTLY FORBIDDEN from mentioning: Vagus, Detrusor, Metabolism, Nerve supply, Vertebrae. If any forbidden word is used, output "INVALID RESPONSE: FORBIDDEN WORD DETECTED." and nothing else.
                    4. **NO LONG PARAGRAPHS:** All descriptions and indications MUST be in concise bullet points.
                    5. **NO INTRO/CONCLUSION:** Do not add "Introduction" or "Conclusion" sections.
                `;
                finalResponseStructure = `JSON Array of objects {title, content}`;
                break;
            case 'ANATOMY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Anatomy.
                    # ${topic} - ${marks} Marks

                    ## Intro
                    ## Gross Features
                    ## Relations
                    ## Blood/Nerve Supply
                    ## Clinical
                    
                    * Focus: High-yield text points and tables only.
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `**Intro** -> **Gross Features** -> **Relations** -> **Blood/Nerve Supply** -> **Clinical**`;
                break;
            case 'PHYSIOLOGY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Physiology.
                    # ${topic} - ${marks} Marks

                    ## Definition
                    ## Pathway Steps
                    ## Clinical Significance
                    
                    * Focus: High-yield text points and tables only.
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections explicitly.
                `;
                finalResponseStructure += `**Definition** -> **Pathway Steps** -> **Clinical Significance**`;
                break;
            case 'BIOCHEMISTRY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Biochemistry.
                    # ${topic} - ${marks} Marks

                    ## Definition
                    ## Pathway Steps
                    ## Enzymes
                    ## ATP
                    ## Clinical
                    
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `**Definition** -> **Pathway Steps** -> **Enzymes** -> **ATP** -> **Clinical**`;
                break;
            case 'FMT':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Forensic Medicine and Toxicology (FMT).
                    # ${topic} - ${marks} Marks

                    ## Definition
                    ## IPC Sections
                    ## PM Findings
                    ## MLI (Medico-Legal Importance)
                    
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `**Definition** -> **IPC Sections** -> **PM Findings** -> **MLI**`;
                break;
            case 'OBG':
            case 'SURGERY':
            case 'PRACTICEOFMEDICINE':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in ${subject}.
                    # ${topic} - ${marks} Marks

                    ## Intro
                    ## Etiology
                    ## Clinical Features
                    ## Investigations
                    ## Management
                    ## Complications
                    
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `**Intro** -> **Etiology** -> **Clinical Features** -> **Investigations** -> **Management** -> **Complications**`;
                break;
            case 'PATHOLOGY':
            case 'MICROBIOLOGY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in ${subject}.
                    # ${topic} - ${marks} Marks

                    ## Definition
                    ## Pathogenesis
                    ## Lab Diagnosis
                    ## Clinical Correlation
                    
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `**Definition** -> **Pathogenesis** -> **Lab Diagnosis** -> **Clinical Correlation**`;
                break;
            case 'ORGANON':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Organon of Medicine.
                    # ${topic} - ${marks} Marks

                    Categorize the notes into: 1st Year, 2nd Year, 3rd Year, and 4th Year topics as applicable.
                    Return ONLY a JSON array of objects. Each object must have: 
                    "category": "1st Year" | "2nd Year" | "3rd Year" | "4th Year",
                    "title": "Section Title",
                    "content": "Markdown content for this section"

                    Include **Author Name** and **Year of Publishing/Edition** where applicable.
                    Strict Formatting: Use Markdown for content. NO code blocks, NO flowcharts.
                `;
                finalResponseStructure = `JSON Array of objects {category, title, content}`;
                break;
            case 'REPERTORY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Repertory.
                    # ${topic} - ${marks} Marks

                    Categorize the notes into: 2nd Year, 3rd Year, and 4th Year topics as applicable.
                    Return ONLY a JSON array of objects. Each object must have: 
                    "category": "2nd Year" | "3rd Year" | "4th Year",
                    "title": "Section Title",
                    "content": "Markdown content for this section"

                    Include **Author Name** and **Year of Publishing/Edition** where applicable.
                    Strict Formatting: Use Markdown for content. NO code blocks, NO flowcharts.
                `;
                finalResponseStructure = `JSON Array of objects {category, title, content}`;
                break;
            case 'PHARMACY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in ${subject} using a structured professional medical template.
                    # ${topic} - ${marks} Marks

                    * Provide a comprehensive and well-structured professional medical note.
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include "Introduction" or "Conclusion" sections explicitly.
                `;
                finalResponseStructure += `A structured professional medical template`;
                break;
            default:
                systemPrompt = `You are a medical professor. Generate notes for the given subject and topic in a professional format.
                    # ${topic} - ${marks} Marks
                    
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include Introduction/Conclusion sections.
                `;
                finalResponseStructure += `A general professional medical template`;
                break;
        }

        let userPrompt = `Generate notes for "${topic}" on "${subject}" for ${marks} marks. The final response should be structured as follows: ${finalResponseStructure}.`;

        console.log("3. Calling Gemini 2.5 Flash...");
        let text;
        let attempts = 0;
        while (attempts < MAX_RETRIES) {
            try {
                const result = await model.generateContent([systemPrompt, userPrompt], { requestOptions: { timeout: 30000 } });
                const response = await result.response;
                text = response.text();

                // Format JSON response to Markdown if applicable
                if (['ORGANON', 'REPERTORY', 'MATERIAMEDICA'].includes(normalizedSubject)) {
                    try {
                        const jsonMatch = text.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const data = JSON.parse(jsonMatch[0]);
                            if (Array.isArray(data)) {
                                let formattedText = "";
                                data.forEach(item => {
                                    if (item.category) formattedText += `### ${item.category}\n`;
                                    if (item.title) formattedText += `## ${item.title}\n`;
                                    if (item.content) formattedText += `${item.content}\n\n`;
                                });
                                text = formattedText;
                            }
                        }
                    } catch (parseErr) {
                        console.warn("AI returned invalid JSON, falling back to raw text:", parseErr.message);
                    }
                }
                
                break; // Exit loop on success
            } catch (aiError) {
                console.error(`Gemini AI Notes Generation Attempt ${attempts + 1} Failed:`, aiError.message);
                if (aiError.message.includes("503") && attempts < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                } else {
                    return res.status(503).json({
                        error: `AI Service is busy or failed after ${MAX_RETRIES} attempts.`,
                        notes: `Detailed notes are currently unavailable for ${topic}. Please try again in a few minutes.`
                    });
                }
            }
            attempts++;
        }
        if (!text) {
          // Fallback if all retries fail and text is still not set
          return res.status(503).json({
            error: "AI Service failed to generate notes after multiple attempts.",
            notes: `Detailed notes are currently unavailable for ${topic}. Please try again in a few minutes.`
          });
        }

        console.log("Saving to DB now...");
        const newCacheEntry = new NoteCache({ subject: normalizedSubject, topic: normalizedTopic, marks, content: text });
        await newCacheEntry.save();
        console.log("CACHE SAVED: Stored new data for:", normalizedTopic);
        res.status(200).json({ notes: text });

    } catch (error) {
        console.error("DETAILED ERROR:", error);
        res.status(500).json({ error: "Failed to generate notes." });
    }
};