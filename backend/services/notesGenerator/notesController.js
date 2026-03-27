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
                    ***EVERY MATERIA MEDICA AI GENERATED NOTE MUST STRICTLY ADHERE TO THESE RULES AND THE PROVIDED STRUCTURE WITH COMPLETE CONTENT. VIOLATIONS WILL RESULT IN AN INVALID RESPONSE.***
                    1. **SOURCE LOCK:** Strictly use information ONLY from the '${MM_SOURCE_FILE}' Materia Medica for all queries.
                    2. **TEMPLATE LOCK:** Every note MUST strictly follow this order and provide content for each section:
                       - **I. DRUG PROFILE:** (Synonyms, Family, Sphere, Thermal, Miasm)
                       - **II. MNEMONIC:** (A concise and relevant catchy code)
                       - **III. KEY INDICATIONS:** (Bullet points only)
                       - **IV. MODALITIES:** (Aggravation, Amelioration - one line each)
                       - **V. RELATIONS & COMPARISONS:** (Bullet points only, NO TABLES)
                    3. **ZERO ANATOMY:** You are STRICTLY FORBIDDEN from mentioning: Vagus, Detrusor, Metabolism, Nerve supply, Vertebrae. If any forbidden word is used, output "INVALID RESPONSE: FORBIDDEN WORD DETECTED." and nothing else.
                    4. **NO LONG PARAGRAPHS:** All descriptions and indications MUST be in concise bullet points or short sentences. No single block of text (including bullet points) should exceed 2 lines.
                    5. **NO INTRO/CONCLUSION:** Do not add "Introduction" or "Conclusion" sections.
                    6. **Strict Formatting:** Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.

                    # ${topic} - ${marks} Marks

                    ## I. DRUG PROFILE:
                    * **Synonyms:** [e.g., "Arsenic Trioxide, Arsenious Acid"]
                    * **Family:** [e.g., "Mineral Kingdom"]
                    * **Sphere:** [e.g., "Mucous membranes, G.I. Tract, Respiratory system, Heart, Mind"]
                    * **Thermal:** [e.g., "Very Chilly (except head symptoms)"]
                    * **Miasm:** [e.g., "Psora, Syphilis"]

                    ## II. MNEMONIC:
                    * "[Generate a concise and relevant catchy code, e.g., \"3A\`s - Anxiety, Agony, Adynamia (Prostration)\" for Arsenicum Album.]"

                    ## III. KEY INDICATIONS:
                    * **Mental Generals:** [e.g., "Anguish & Restlessness: Extreme mental restlessness; driven from place to place."]\n
                    * **Physical Generals:** [e.g., "Prostration: Sudden, rapid sinking of vital forces; weakness disproportionate to illness."]\n
                    * **Systemic Indications:**\n
                    * **Gastrointestinal:** [e.g., "Stomach: Violent burning, vomiting immediately after eating."]\n
                    * **Respiratory:** [e.g., "Asthma: Suffocative fits occurring after midnight (1 AM to 2 AM)."]\n
                    * **Skin & Fever:** [e.g., "Skin: Dry, scaly, wrinkled; itching and burning worse from scratching."]\n

                    ## IV. MODALITIES:
                    * **Aggravation:** [e.g., "After midnight (1 AM to 3 AM), cold air, cold food/drinks, lying on back."]\n
                    * **Amelioration:** [e.g., "Warmth in general, hot drinks, warm applications, sitting up, bending forward."]\n
                    
                    ## V. RELATIONS & COMPARISONS:
                    * **Complementary:** [e.g., "Thuja, Carbo Veg"]
                    * **Inimical:** [e.g., "Sepia"]
                    * **Compare:** [e.g., "Rhus Tox (restlessness), Veratrum Album (coldness, collapse)"]\n
                `;
                finalResponseStructure += `**Profile** -> **Mnemonic** -> **Key Indications** -> **Modalities** -> **Relations**`;
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
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Organon.
                    # ${topic} - ${marks} Marks

                    * Provide a comprehensive and well-structured professional medical note.
                    * For Organon, include **Author Name** and **Year of Publishing/Edition** where applicable.
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include "Introduction" or "Conclusion" sections explicitly.
                `;
                finalResponseStructure += `A structured professional medical template including Author and Year for Organon.`;
                break;
            case 'REPERTORY':
                systemPrompt = `You are a medical professor. Generate notes for the given topic in Repertory.
                    # ${topic} - ${marks} Marks

                    * Provide a comprehensive and well-structured professional medical note.
                    * For Repertory, include **Author Name** and **Year of Publishing/Edition** where applicable.
                    * Strict Formatting: Only use Markdown Headings (e.g., #, ##), Bullet Points (e.g., *, -), and **Bold** text. Absolutely NO code blocks, NO JSON-like structures, and NO flowcharts or visual diagrams.
                    * Do NOT include "Introduction" or "Conclusion" sections explicitly.
                `;
                finalResponseStructure += `A structured professional medical template including Author and Year for Repertory.`;
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

        console.log("3. Calling Gemini 2.0 Flash...");
        let text;
        let attempts = 0;
        while (attempts < MAX_RETRIES) {
            try {
                const result = await model.generateContent([systemPrompt, userPrompt], { requestOptions: { timeout: 30000 } });
                const response = await result.response;
                text = response.text();
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