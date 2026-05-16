import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

let aiInstance: GoogleGenAI | null = null;

let lastQuotaErrorTime = 0;
const QUOTA_COOLDOWN = 15 * 60 * 1000; // 15 minutes cooldown after quota exhausted

async function callAIWithRetry<T>(
  apiCall: () => Promise<T>,
  fallbackValue: T,
  retries = 1,
  delay = 5000,
  context = "AI API"
): Promise<T> {
  const timestamp = () => new Date().toISOString();
  const now = Date.now();

  // Circuit breaker: skip API if we recently hit quota
  if (now - lastQuotaErrorTime < QUOTA_COOLDOWN) {
    return fallbackValue;
  }
  
  try {
    return await apiCall();
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || "Unknown error";
    const status = error?.status || "N/A";
    const isQuotaError = error?.status === 429 || errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
    
    if (isQuotaError) {
      lastQuotaErrorTime = Date.now();
    }

    if (retries > 0 && isQuotaError) {
      console.log(`[${timestamp()}] [${context}] [RATE_LIMIT] Quota limited (Status: ${status}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callAIWithRetry(apiCall, fallbackValue, retries - 1, delay * 2, context);
    }
    
    if (isQuotaError) {
      console.info(`[${timestamp()}] [${context}] Quota exhausted. API calls suspended for 15m. Using fallbacks.`);
    } else {
      console.error(`[${timestamp()}] [${context}] [API_ERROR] Permanent failure (Status: ${status}). Error: ${errorMsg}`);
    }
    return fallbackValue;
  }
}

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will use fallback content.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

app.use(express.json());

// In-memory cache for audio
const audioCache: Record<string, string> = {};

app.get("/api/dictionary/:word", async (req, res) => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(req.params.word)}`);
    if (!response.ok) {
      if (response.status === 404) return res.status(404).json({ error: "Word not found" });
      throw new Error("Failed to fetch dictionary data");
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Dictionary API Error:", error);
    res.status(500).json({ error: "Failed to fetch dictionary data" });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, type, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    // Voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    let voiceName = voice || (type === 'UK' ? 'Puck' : 'Kore');
    
    const cacheKey = `${voiceName}-${text}`;
    if (audioCache[cacheKey]) {
      return res.json({ audio: audioCache[cacheKey] });
    }

    const ai = getAI();
    if (!ai) {
      return res.status(503).json({ error: "AI Engine not initialized" });
    }

    const base64Audio = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"] as any,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    }, null, 1, 5000, `TTS:${voiceName}`);

    if (base64Audio) {
      audioCache[cacheKey] = base64Audio;
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Failed to generate audio" });
    }
  } catch (error: any) {
    // callAIWithRetry already logs Error details
    res.status(500).json({ error: "Failed to generate audio. Rate limit or server error." });
  }
});

const genres = [
  "Science", 
  "Arts", 
  "Technology", 
  "Nature", 
  "Philosophy", 
  "Literature", 
  "Cinema", 
  "History",
  "Music",
  "Sports",
  "Psychology",
  "Architecture",
  "Astronomy",
  "Gastronomy",
  "Economics",
  "Mythology",
  "Fashion",
  "Photography",
  "Oceanography",
  "Anthropology",
  "Archeology",
  "Astrophysics",
  "Culinary",
  "Sustainable Tech",
  "Diplomacy",
  "Cryptography",
  "Renewable Energy",
  "Artificial Intelligence",
  "Genetic Engineering",
  "Social Media",
  "Cybersecurity",
  "Neuroscience",
  "Linguistics",
  "Theology",
  "Journalism",
  "Legal",
  "Medical",
  "Romance",
  "Relationships",
  "Emotional Intelligence",
  "Romantic Literature",
  "Poetry",
  "Space Exploration",
  "Quantum Mechanics",
  "Philosophy of Mind",
  "Data Science",
  "Environmental Ethics",
  "Biotechnology",
  "Urban Planning",
  "Fine Arts",
  "Classical Music",
  "Digital Forensics",
  "Geopolitics",
  "Marine Biology",
  "Art of Empathy",
  "Human Connection",
  "Social Dynamics",
  "Renaissance Philosophy",
  "Modern Architecture",
  "Culinary Science",
  "Fashion Design",
  "Ethical AI",
  "Altruism",
  "Platonic Love",
  "Unconditional Love",
  "Courtly Love",
  "Interpersonal Connectivity",
  "Compassionate Leadership",
  "Philanthropy",
  "Empathy in Design",
  "Social Psychology",
  "Non-Verbal Communication",
  "Conflict Resolution",
  "Digital Ethics",
  "Nanotechnology",
  "Behavioral Economics",
  "Linguistic Evolution",
  "Urban Ecology",
  "Exoplanet Research",
  "Speculative Fiction",
  "Classical Mythology",
  "Data Ethics",
  "Biomimicry"
];

app.get("/api/genres", (req, res) => {
  res.json(genres);
});

async function getWordInfoWithRetry(term: string): Promise<any> {
  const ai = getAI();
  if (!ai) {
    throw new Error("AI Engine not initialized. API Key likely missing.");
  }

  const prompt = `
    You are an English vocabulary expert. 
    Provide comprehensive details for the term: "${term}".
    
    Provide:
    - The term itself
    - A phonetic transcription (IPA)
    - A simple, clear meaning
    - Three vivid examples of usage
    - Three synonyms (related terms)
    - Three antonyms
    - Up to three derivatives (e.g., adjective, verb, or noun form of the term with meaning and example)
    - A brief usage nuance or tip
    - A brief historical origin
    
    Return as JSON matching the structure:
    {
      "term": string,
      "phonetic": string,
      "meaning": string,
      "examples": string[],
      "relatedTerms": string[],
      "antonyms": string[],
      "derivatives": [
        {
          "term": string,
          "meaning": string,
          "example": string
        }
      ],
      "nuance": string,
      "history": string
    }
  `;

  return await callAIWithRetry(async () => {
    const modelToUse = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            term: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            meaning: { type: Type.STRING },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
            antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            derivatives: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: {
                  term: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  example: { type: Type.STRING }
                },
                required: ["term", "meaning", "example"]
              } 
            },
            nuance: { type: Type.STRING },
            history: { type: Type.STRING }
          },
          required: ["term", "phonetic", "meaning", "examples", "relatedTerms", "antonyms", "nuance", "history"]
        }
      }
    });

    return JSON.parse(response.text);
  }, {
    term: term,
    phonetic: "/.../",
    meaning: `The linguistic essence of ${term} in the context of professional discourse.`,
    examples: [
      `The concept of ${term} is central to today's discussion.`,
      `We must consider the ${term} before proceeding.`,
      `Experts often debate the implications of ${term}.`
    ],
    relatedTerms: ["Concept", "Element", "Factor"],
    antonyms: ["Opposite", "Reverse", "Contrary"],
    nuance: "This term carries significant weight in formal communication.",
    history: "Originates from a complex linguistic lineage."
  }, 1, 5000, `WordInfo:${term}`);
}

app.get("/api/word-info", async (req, res) => {
  const term = req.query.term as string;
  if (!term) return res.status(400).json({ error: "Term is required" });

  try {
    const info = await getWordInfoWithRetry(term);
    res.json(info);
  } catch (error: any) {
    console.warn(`Error fetching word info for ${term}, using generic fallback:`, error);
    
    // Provide a reasonably useful fallback instead of failing
    const genericFallback = {
      term: term,
      phonetic: "/.../",
      meaning: `The linguistic essence of ${term} in the context of professional discourse.`,
      examples: [
        `The concept of ${term} is central to today's discussion.`,
        `We must consider the ${term} before proceeding.`,
        `Experts often debate the implications of ${term}.`
      ],
      relatedTerms: ["Concept", "Element", "Factor"],
      antonyms: ["Opposite", "Reverse", "Contrary"],
      nuance: "This term carries significant weight in formal communication.",
      history: "Originates from a complex linguistic lineage."
    };
    
    res.json(genericFallback);
  }
});

function getGenreOfDay() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return genres[dayOfYear % genres.length];
}

const FALLBACK_CONTENT: Record<string, any> = {
  "Science": {
    genre: "Science",
    word: { 
      term: "Hypothesis", 
      phonetic: "/haɪˈpɒθɪsɪs/", 
      meaning: "A proposed explanation made on the basis of limited evidence as a starting point for further investigation.", 
      examples: ["The scientist formulated a hypothesis to explain the unexpected results.", "Research began by testing the hypothesis in a controlled environment.", "A valid hypothesis must be testable and falsifiable."], 
      relatedTerms: ["Theory", "Assumption", "Proposition"],
      antonyms: ["Fact", "Certainty", "Proof"],
      derivatives: [
        { term: "Hypothesize", meaning: "To form a hypothesis.", example: "Scientists hypothesize that the planet may support life." },
        { term: "Hypothetical", meaning: "Based on or involving a hypothesis.", example: "Let's consider a hypothetical situation." }
      ],
      nuance: "A hypothesis is an educated guess, unlike a theory which is heavily supported by evidence.",
      history: "From Greek hupothesis, meaning 'foundation' or 'supposition'."
    },
    connector: { 
      term: "Consequently", 
      phonetic: "/ˈkɒnsɪkwəntli/", 
      meaning: "As a result of something.", 
      examples: ["The data was inconsistent; consequently, the study was extended.", "He failed to follow the protocol; consequently, the experiment failed.", "The temperature dropped rapidly; consequently, the reaction slowed down."], 
      relatedTerms: ["Therefore", "Hence", "Thus"],
      antonyms: ["Previously", "Beforehand", "Initially"],
      nuance: "Often used in formal writing to connect a cause to an effect.",
      history: "From Latin consequentem, meaning 'following after'."
    },
    phrase: { 
      term: "Empirical evidence", 
      phonetic: "/ɛmˈpɪrɪkəl ˈɛvɪdəns/", 
      meaning: "Information acquired by observation or experimentation.", 
      examples: ["The theory lacks empirical evidence to support its claims.", "Scientists rely on empirical evidence to validate their findings.", "Observation provided the necessary empirical evidence for the discovery."], 
      relatedTerms: ["Hard facts", "First-hand data", "Proof"],
      antonyms: ["Theory", "Rumor", "Speculation"],
      nuance: "Refers specifically to data you can measure or see yourself.",
      history: "Empirical comes from Greek empeirikos, meaning 'experienced'."
    },
    idiom: { 
      term: "Blind with science", 
      phonetic: "/blaɪnd wɪð ˈsaɪəns/", 
      meaning: "To overwhelm someone with complex or technical information.", 
      examples: ["The salesman tried to blind me with science, but I saw through the jargon.", "Don't try to blind us with science; just give us the facts.", "The technical manual was clearly designed to blind the average user with science."], 
      relatedTerms: ["Technobabble", "Jargon", "Technicalities"],
      antonyms: ["Simplify", "Clarify", "Explain plainly"],
      nuance: "Used when someone is intentionally trying to confuse others with complexity.",
      history: "A 19th-century expression that became popular in common speech."
    }
  },
  "History": {
    genre: "History",
    word: { 
      term: "Anachronism", 
      phonetic: "/əˈnækrəˌnɪzəm/", 
      meaning: "Something that is out of its proper time, especially something that belongs to an earlier period.", 
      examples: ["The use of a wristwatch in a film set in the 17th century is a clear anachronism.", "In today's digital world, paper memos are starting to feel like an anachronism.", "The novel was criticized for several historical anachronisms."], 
      relatedTerms: ["Misplacement", "Prochronism", "Archaism"],
      antonyms: ["Contemporary", "Modernism", "Sync"],
      nuance: "Often used in art to point out technical inaccuracies in period pieces.",
      history: "From Greek ana- 'against' and khronos 'time'."
    },
    connector: { 
      term: "Hitherto", 
      phonetic: "/ˌhɪðəˈtuː/", 
      meaning: "Until now or until the point in time under discussion.", 
      examples: ["Hitherto, the true cause of the war was unknown to the public.", "the expansion of the empire into hitherto uncharted territories.", "The research uncovered facts that had hitherto been ignored."], 
      relatedTerms: ["Formerly", "Previously", "Heretofore"],
      antonyms: ["Henceforth", "Currently", "Future"],
      nuance: "Sounds formal and is mostly found in historical or legal texts.",
      history: "Old English 'hider' (hither) combined with 'to'."
    },
    phrase: { 
      term: "Prime mover", 
      phonetic: "/praɪm ˈmuːvə/", 
      meaning: "A person or thing that is the main cause of an activity or progress.", 
      examples: ["She was the prime mover behind the new educational reforms.", "Economic interest was the prime mover of the colonial expansion.", "The prime mover of the revolution remains a figure of intense debate."], 
      relatedTerms: ["Driving force", "Catalyst", "Instigator"],
      antonyms: ["Bystander", "Follower", "Effect"],
      nuance: "Implies a powerful, often hidden, driving force.",
      history: "From Aristotle's term for the first cause of all motion in the universe."
    },
    idiom: { 
      term: "Water under the bridge", 
      phonetic: "/ˈwɔːtə ˈʌndə ðə brɪdʒ/", 
      meaning: "Problems or disagreements from the past that are no longer important.", 
      examples: ["We had our differences, but that's all water under the bridge now.", "Don't worry about the mistake; it's water under the bridge.", "They are friends again, treating their old rivalry as water under the bridge."], 
      relatedTerms: ["Old news", "Past history", "Forgiven"],
      antonyms: ["Active grudge", "Current issue", "Fresh wound"],
      nuance: "Used to indicate that you are moving on from a past conflict.",
      history: "Visualizing the movement of a river flowing away."
    }
  },
  "Arts": {
    genre: "Arts",
    word: { 
      term: "Aesthetic", 
      phonetic: "/iːsˈθɛtɪk/", 
      meaning: "Concerned with beauty or the appreciation of beauty.", 
      examples: ["The building's aesthetic appeal attracted many visitors.", "She has a unique aesthetic when it comes to interior design.", "The film was praised for its visual aesthetic and lighting."], 
      relatedTerms: ["Artistic", "Elegant", "Exquisite"],
      antonyms: ["Hideous", "Functional", "Ugly"],
      nuance: "Can refer to a general philosophy of beauty or a specific visual style.",
      history: "From Greek aisthetikos, meaning 'perceptive' or 'sensitive'."
    },
    connector: { 
      term: "In contrast", 
      phonetic: "/ɪn ˈkɒntrɑːst/", 
      meaning: "Used to point out a striking difference between two things.", 
      examples: ["The first painting was vibrant; in contrast, the second was somber.", "In contrast to his earlier work, this novel is quite experimental.", "The city is bustling; in contrast, the countryside is peaceful."], 
      relatedTerms: ["Conversely", "On the other hand", "Alternatively"],
      antonyms: ["Similarly", "Likewise", "Equally"],
      nuance: "Stronger than 'but'; used to emphasize distinct opposition.",
      history: "From Latin contra- 'against' and stare 'to stand'."
    },
    phrase: { 
      term: "Mixed media", 
      phonetic: "/mɪkst ˈmiːdiə/", 
      meaning: "An artwork in which more than one medium or material has been employed.", 
      examples: ["The exhibit featured several impressive mixed media installations.", "She specializes in mixed media collages using fabric and paper.", "He experimented with mixed media to create a textured effect."], 
      relatedTerms: ["Collage", "Assemblage", "Multimedia"],
      antonyms: ["Single-medium", "Uniform", "Traditional"],
      nuance: "Often implies a modern, experimental approach to art.",
      history: "Became a popular term with the rise of modernism in the 20th century."
    },
    idiom: { 
      term: "A picture paints a thousand words", 
      phonetic: "/ə ˈpɪktʃə peɪnts ə ˈθaʊzənd wɜːdz/", 
      meaning: "A visual image can convey a complex idea more effectively than text.", 
      examples: ["Seeing the photograph of the landscape made me realize that a picture paints a thousand words.", "The infographic was so clear because, as they say, a picture paints a thousand words.", "In the world of advertising, a picture really does paint a thousand words."], 
      relatedTerms: ["Visualization", "Illustration", "Impactful imagery"],
      antonyms: ["Abstract", "Vague description", "Dry text"],
      nuance: "Stresses the importance of visual communication.",
      history: "Attributed to various sources, popularized by American advertising in the 1920s."
    }
  },
  "Nature": {
    genre: "Nature",
    word: { 
      term: "Ephemeral", 
      phonetic: "/ɪˈfɛmərəl/", 
      meaning: "Lasting for a very short time.", 
      examples: ["The beauty of the sunset was ephemeral, fading into darkness within minutes.", "Wildflowers have an ephemeral bloom that only lasts a few days.", "He captured the ephemeral nature of the morning mist in his photograph."], 
      relatedTerms: ["Transient", "Fleeting", "Short-lived"],
      antonyms: ["Eternal", "Permanent", "Lasting"],
      nuance: "Often used to describe delicate or natural beauty that doesn't last.",
      history: "From Greek ephemeros, meaning 'lasting only a day'."
    },
    connector: { 
      term: "In light of", 
      phonetic: "/ɪn laɪt ɒv/", 
      meaning: "Drawing attention to a particular fact or discovery.", 
      examples: ["In light of recent evidence, the theory must be revised.", "The policy was changed in light of public feedback.", "In light of the weather forecast, we decided to postpone the hike."], 
      relatedTerms: ["Considering", "Given", "Account for"],
      antonyms: ["Despite", "Regardless", "Ignoring"],
      nuance: "Useful for explaining why a decision or shift in thought occurred.",
      history: "An idiom that likens new information to shining a light on a subject."
    },
    phrase: { 
      term: "Ecosystem services", 
      phonetic: "/ˈiːkəʊˌsɪstəm ˈsɜːvɪsɪz/", 
      meaning: "The many and varied benefits to humans provided by the natural environment and healthy ecosystems.", 
      examples: ["Pollination is one of the most critical ecosystem services provided by insects.", "Wetlands provide ecosystem services such as water purification.", "We must value ecosystem services when making industrial decisions."], 
      relatedTerms: ["Natural capital", "Environmental benefits", "Bio-resources"],
      antonyms: ["Industrial output", "Pollution", "Urban sprawl"],
      nuance: "A term used in economics and ecology to quantify nature's value.",
      history: "Gained prominence in the 2000s through international ecological studies."
    },
    idiom: { 
      term: "Barking up the wrong tree", 
      phonetic: "/ˈbɑːkɪŋ ʌp ðə rɒŋ triː/", 
      meaning: "Looking in the wrong place or accusing the wrong person.", 
      examples: ["If you think I stole your pen, you're barking up the wrong tree.", "The detectives were barking up the wrong tree by focusing on the neighbor.", "He's barking up the wrong tree if he expects a promotion this early."], 
      relatedTerms: ["Misguided", "Off track", "Mistaken"],
      antonyms: ["On target", "Accurate", "Correct"],
      nuance: "Implies a wasted effort based on a false assumption.",
      history: "Based on hunting dogs barking at a tree after the prey has already escaped."
    }
  },
  "Technology": {
    genre: "Technology",
    word: { 
      term: "Algorithm", 
      phonetic: "/ˈælɡərɪðəm/", 
      meaning: "A process or set of rules to be followed in calculations or other problem-solving operations, especially by a computer.", 
      examples: ["The search engine uses a complex algorithm to rank results.", "Social media algorithms determine what content you see first.", "He developed an algorithm to optimize the delivery routes."], 
      relatedTerms: ["Process", "Procedure", "Computation"],
      antonyms: ["Chaos", "Luck", "Randomness"],
      nuance: "Not just for computers; a recipe is essentially an algorithm for cooking.",
      history: "Named after the 9th-century mathematician Al-Khwarizmi."
    },
    connector: { 
      term: "Furthermore", 
      phonetic: "/ˌfɜːðəˈmɔː/", 
      meaning: "In addition; besides (used to introduce a fresh consideration or an additional point).", 
      examples: ["The design is flawed; furthermore, it is prohibitively expensive.", "He is a brilliant coder; furthermore, he has great leadership skills.", "The new software is faster; furthermore, it consumes less memory."], 
      relatedTerms: ["Moreover", "Additionally", "Besides"],
      antonyms: ["Alternatively", "Instead", "Contrarily"],
      nuance: "Used to build on an established argument with even more evidence.",
      history: "Middle English combination of 'further' and 'more'."
    },
    phrase: { 
      term: "Technical debt", 
      phonetic: "/ˈtɛknɪkəl dɛt/", 
      meaning: "The implied cost of additional rework caused by choosing an easy solution now instead of using a better approach that would take longer.", 
      examples: ["Choosing a quick fix now will increase our technical debt later.", "The team spent weeks paying down technical debt before starting the new feature.", "Ignoring documentation leads to a massive accumulation of technical debt."], 
      relatedTerms: ["Code rot", "Legacy issues", "Short-cut cost"],
      antonyms: ["Clean code", "Architecture", "Robust system"],
      nuance: "Like financial debt, it accumulates 'interest' in the form of future work.",
      history: "Coined by Ward Cunningham to explain to managers why code needs maintenance."
    },
    idiom: { 
      term: "Cutting edge", 
      phonetic: "/ˌkʌtɪŋ ˈɛdʒ/", 
      meaning: "The most advanced or innovative stage or area of something.", 
      examples: ["The company is at the cutting edge of semiconductor research.", "Their new product features cutting-edge technology.", "He wants to work on the cutting edge of artificial intelligence."], 
      relatedTerms: ["State of the art", "Innovative", "Pioneer"],
      antonyms: ["Obsolete", "Outdated", "Traditional"],
      nuance: "Implies being at the very front of progress.",
      history: "Likens progress to a blade cutting through the unknown."
    }
  },
  "Philosophy": {
    genre: "Philosophy",
    word: { 
      term: "Existential", 
      phonetic: "/ˌɛɡzɪˈstɛnʃəl/", 
      meaning: "Relating to existence, especially human existence.", 
      examples: ["The character faces an existential crisis throughout the novel.", "Climate change is an existential threat to many coastal communities.", "His philosophy focuses on existential freedom and responsibility."], 
      relatedTerms: ["Ontological", "Experiential", "Being"],
      antonyms: ["Trivial", "Inessential", "External"],
      nuance: "Can refer to a deeply personal crisis or a literal threat to survival.",
      history: "From Latin existere, meaning 'to stand out' or 'to emerge'."
    },
    connector: { 
      term: "Paradoxically", 
      phonetic: "/ˌpærəˈdɒksɪkli/", 
      meaning: "In a seemingly absurd or self-contradictory way.", 
      examples: ["Paradoxically, the more he earned, the less he felt he had.", "Paradoxically, the strict rules led to more creative freedom.", "The medicine, paradoxically, made the symptoms worse at first."], 
      relatedTerms: ["Ironically", "Contradictorily", "Inconsistently"],
      antonyms: ["Logically", "Consistently", "Simply"],
      nuance: "Used when the result is the opposite of what is logically expected.",
      history: "From Greek paradoxos, meaning 'contrary to opinion'."
    },
    phrase: { 
      term: "Categorical imperative", 
      phonetic: "/ˌkætɪˈɒrɪkəl ɪmˈpɛrətɪv/", 
      meaning: "An unconditional moral obligation which is binding in all circumstances.", 
      examples: ["Kant's categorical imperative suggests we should act only on rules that could be universal laws.", "Treating others with respect is a categorical imperative for a civilized society.", "The lawyer argued that honesty is a categorical imperative in the courtroom."], 
      relatedTerms: ["Moral law", "Universal duty", "Ethical absolute"],
      antonyms: ["Relative ethics", "Choice", "Option"],
      nuance: "A core concept in Kantian ethics, emphasizing universal duty.",
      history: "Coined by Immanuel Kant in the late 18th century."
    },
    idiom: { 
      term: "Food for thought", 
      phonetic: "/fuːd fɔː θɔːt/", 
      meaning: "Something that warrants serious consideration.", 
      examples: ["The documentary gave us plenty of food for thought regarding our consumption habits.", "His lecture provided much food for thought for the students.", "That's an interesting perspective; definitely food for thought."], 
      relatedTerms: ["Inspiration", "Reflection", "Stimulus"],
      antonyms: ["Mindless", "Ignored", "Triviality"],
      nuance: "A high-level way to say something is interesting to think about.",
      history: "A metaphor comparing mental stimulation to physical nourishment."
    }
  },
  "Psychology": {
    genre: "Psychology",
    word: { 
      term: "Cognitive", 
      phonetic: "/ˈkɒɡnɪtɪv/", 
      meaning: "Relating to the mental processes of perception, memory, judgment, and reasoning.", 
      examples: ["Cognitive therapy helps patients identify negative thought patterns.", "Sleep deprivation can impair cognitive function and reaction time.", "Children's cognitive development is influenced by their environment."], 
      relatedTerms: ["Mental", "Intellectual", "Perceptual"],
      antonyms: ["Physical", "Instinctive", "Reflexive"],
      nuance: "Refers specifically to thinking processes, distinct from emotional or physical ones.",
      history: "From Latin cognoscere, meaning 'to know'."
    },
    connector: { 
      term: "By extension", 
      phonetic: "/baɪ ɪkˈstɛnʃən/", 
      meaning: "Taking the logic or influence of one thing and applying it to something related.", 
      examples: ["The law affects business owners and, by extension, their employees.", "If we save the forest, we are, by extension, saving many animal species.", "His success benefits his family and, by extension, the whole village."], 
      relatedTerms: ["Consequently", "Following that", "Implicitly"],
      antonyms: ["Independently", "Separately", "Unrelatedly"],
      nuance: "Used to connect the consequences of one thing to another logically linked thing.",
      history: "Mathematical origins, extending a line or a concept into new space."
    },
    phrase: { 
      term: "Locus of control", 
      phonetic: "/ˈləʊkəs ɒv kənˈtrəʊl/", 
      meaning: "The degree to which people believe they have control over the outcome of events in their lives.", 
      examples: ["Having an internal locus of control is associated with higher life satisfaction.", "Stressed individuals often feel they have an external locus of control.", "The workshop focuses on strengthening a student's internal locus of control."], 
      relatedTerms: ["Self-efficacy", "Agency", "Autonomy"],
      antonyms: ["Fatalism", "Helplessness", "Luck"],
      nuance: "External means blaming luck; Internal means believing in your own effort.",
      history: "Developed by Julian Rotter in 1954 as part of social learning theory."
    },
    idiom: { 
      term: "Head in the clouds", 
      phonetic: "/hɛd ɪn ðə klaʊdz/", 
      meaning: "Being unrealistic or having impractical ideas.", 
      examples: ["He has his head in the clouds if he thinks he can win without practicing.", "Stop having your head in the clouds and focus on the current task.", "The visionary leader was often accused of having his head in the clouds."], 
      relatedTerms: ["Visionary", "Unrealistic", "Idealistic"],
      antonyms: ["Grounded", "Practical", "Realistic"],
      nuance: "Can be negative (unfocused) or positive (highly imaginative).",
      history: "Dates back to the 17th century, describing someone whose thoughts are far from reality."
    }
  },
  "Economics": {
    genre: "Economics",
    word: { 
      term: "Fiscal", 
      phonetic: "/ˈfɪskəl/", 
      meaning: "Relating to government revenue, especially taxes.", 
      examples: ["The government introduced new fiscal measures to curb inflation.", "Fiscal policy plays a crucial role in economic stability.", "The company is facing several fiscal challenges this quarter."], 
      relatedTerms: ["Financial", "Monetary", "Budgetary"],
      antonyms: ["Private", "Social", "Non-profit"],
      nuance: "Strictly relates to government money, specifically taxes and spending.",
      history: "From Latin fiscus, meaning 'money basket' or 'public treasury'."
    },
    connector: { 
      term: "Pro rata", 
      phonetic: "/prəʊ ˈrɑːtə/", 
      meaning: "Proportional allocated or dynamic adjustment based on a factor.", 
      examples: ["The bonus will be distributed pro rata based on years of service.", "Charges are calculated on a pro rata basis for partial months.", "The costs were shared pro rata among the partners."], 
      relatedTerms: ["Proportionally", "Commensurately", "Equally"],
      antonyms: ["Fixed sum", "Flat rate", "Unevenly"],
      nuance: "Used frequently in billing and employment contracts.",
      history: "Latin for 'according to the rate'."
    },
    phrase: { 
      term: "Opportunity cost", 
      phonetic: "/ˌɒpəˈtjuːnɪti kɒst/", 
      meaning: "The loss of potential gain from other alternatives when one alternative is chosen.", 
      examples: ["The opportunity cost of going to college is the wages you could have earned working.", "Every investment decision involves an evaluation of opportunity cost.", "Understanding opportunity cost helps in making better financial choices."], 
      relatedTerms: ["Trade-off", "Alternative cost", "Hidden cost"],
      antonyms: ["Sunk cost", "Direct gain", "Free choice"],
      nuance: "Not a literal bill you pay, but the value of what you gave up.",
      history: "Coined by Friedrich von Wieser in the early 20th century."
    },
    idiom: { 
      term: "Bottom line", 
      phonetic: "/ˌbɒtəm ˈlaɪn/", 
      meaning: "The most important fact or the final result (often financial profit/loss).", 
      examples: ["The bottom line is that we need to increase sales by 10%.", "Focusing on the bottom line led to some difficult budget cuts.", "How will this change affect our bottom line?"], 
      relatedTerms: ["Conclusion", "Net profit", "Crux"],
      antonyms: ["Details", "Frills", "Minor point"],
      nuance: "Often used in business to mean profit, but broadly means 'the main point'.",
      history: "Refers to the last line of a financial statement where total profit is shown."
    }
  },
  "Romance": {
    genre: "Romance",
    word: { 
      term: "Enamor", 
      phonetic: "/ɪˈnæmər/", 
      meaning: "To be filled with a feeling of love for someone.", 
      examples: ["He was completely enamored with her from the moment they met.", "It is easy to be enamored by the charm of a small coastal town.", "The young poet was enamored with the idea of unrequited love."], 
      relatedTerms: ["Infatuate", "Captivate", "Charmed"],
      antonyms: ["Repel", "Disgust", "Indifferent"],
      nuance: "Often used in the passive voice (to be enamored of/with).",
      history: "From Old French 'enamourer', based on Latin 'amor' meaning love."
    },
    connector: { 
      term: "Invariably", 
      phonetic: "/ɪnˈvɛːrɪəbli/", 
      meaning: "In every case or on every occasion; always.", 
      examples: ["Invariably, he would bring her flowers on their anniversary.", "The deep affection between them invariably showed in their eyes.", "Romantic stories invariably end with a lesson about the human heart."], 
      relatedTerms: ["Always", "Constantly", "Perpetually"],
      antonyms: ["Never", "Sometimes", "Rarely"],
      nuance: "Suggests a consistent pattern that doesn't change.",
      history: "From Latin 'invariabilis', meaning not changeable."
    },
    phrase: { 
      term: "Star-crossed lovers", 
      phonetic: "/stɑː-krɒst ˈlʌvəz/", 
      meaning: "A pair of lovers whose relationship is often thwarted by outside forces.", 
      examples: ["Romeo and Juliet are the ultimate example of star-crossed lovers.", "The novel tells the story of two star-crossed lovers separated by war.", "Audiences are often drawn to the tragedy of star-crossed lovers."], 
      relatedTerms: ["Ill-fated", "Doomed couple", "Unlucky"],
      antonyms: ["Fortunate couple", "Providential", "Soulmates"],
      nuance: "Refers to the astrological belief that the stars are against the couple.",
      history: "Coined by William Shakespeare in the prologue of Romeo and Juliet."
    },
    idiom: { 
      term: "Head over heels", 
      phonetic: "/hɛd ˈəʊvə hiːlz/", 
      meaning: "Deeply and completely in love.", 
      examples: ["After their first date, he was head over heels for her.", "They are clearly head over heels and plan to marry soon.", "She fell head over heels for the mysterious stranger."], 
      relatedTerms: ["Madly in love", "Infatuated", "Smitten"],
      antonyms: ["Disenchanted", "Falling out of love", "Apathetic"],
      nuance: "Originally 'heels over head', meaning a somersault, but changed over time.",
      history: "A corruption of the older phrase 'heels over head' which dates back to the 14th century."
    }
  }
};

let dailyCache: Record<string, any> = {};

// Helper for exponential backoff retry
async function generateContentWithRetry(genre: string, dateStr: string): Promise<any> {
  const ai = getAI();
  if (!ai) {
    throw new Error("AI Engine not initialized. API Key likely missing.");
  }

  const prompt = `
    You are an elegant English vocabulary expert. 
    Generate a daily learning set for the date: ${dateStr}.
    The theme/genre for today is: ${genre}.
    
    Provide:
    1. A sophisticated but useful Word of the Day related to the genre. Aim for "Tier 2" or "Tier 3" vocabulary (GRE/SAT level but practical).
    2. A "Connector" (conjunction or transitional phrase).
    3. A "Phrase" (common expression or technical term).
    4. An "Idiom" (figurative expression).
    
    For each item, provide:
    - The term
    - A phonetic transcription (IPA)
    - A comprehensible and simple meaning (avoid using the term itself in the meaning)
    - Three clear, vivid, and simple examples that demonstrate usage in everyday context. Ensure they are easy to understand but artistic in phrasing.
    - Three distinct related terms or concepts (synonyms or closely related ideas).
    - Three distinct antonyms (opposites).
    - Up to three derivatives (different parts of speech of the same word, e.g. adjective form, with meaning and example).
    - A brief "Nuance" or "Usage Tip" explaining a subtle detail or a common mistake to avoid.
    - A very brief, simple history or etymology of the term ("History" or "Origins"), explained in simple, non-academic language.
    
    Ensure the examples are approachable and clear.
    Genre: ${genre}
  `;

  return await callAIWithRetry(async () => {
    const modelToUse = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model: modelToUse, 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            genre: { type: Type.STRING },
            word: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                history: { type: Type.STRING },
                nuance: { type: Type.STRING },
                meaning: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                derivatives: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { term: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } },
                    required: ["term", "meaning", "example"]
                  } 
                }
              },
              required: ["term", "phonetic", "meaning", "examples", "relatedTerms", "history", "antonyms", "nuance"]
            },
            connector: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                history: { type: Type.STRING },
                nuance: { type: Type.STRING },
                meaning: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                derivatives: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { term: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } },
                    required: ["term", "meaning", "example"]
                  } 
                }
              },
              required: ["term", "phonetic", "meaning", "examples", "relatedTerms", "history", "antonyms", "nuance"]
            },
            phrase: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                history: { type: Type.STRING },
                nuance: { type: Type.STRING },
                meaning: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                derivatives: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { term: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } },
                    required: ["term", "meaning", "example"]
                  } 
                }
              },
              required: ["term", "phonetic", "meaning", "examples", "relatedTerms", "history", "antonyms", "nuance"]
            },
            idiom: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                history: { type: Type.STRING },
                nuance: { type: Type.STRING },
                meaning: { type: Type.STRING },
                examples: { type: Type.ARRAY, items: { type: Type.STRING } },
                relatedTerms: { type: Type.ARRAY, items: { type: Type.STRING } },
                antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
                derivatives: { 
                  type: Type.ARRAY, 
                  items: { 
                    type: Type.OBJECT, 
                    properties: { term: { type: Type.STRING }, meaning: { type: Type.STRING }, example: { type: Type.STRING } },
                    required: ["term", "meaning", "example"]
                  } 
                }
              },
              required: ["term", "phonetic", "meaning", "examples", "relatedTerms", "history", "antonyms", "nuance"]
            }
          },
          required: ["genre", "word", "connector", "phrase", "idiom"]
        }
      }
    });

    const contentStr = response.text;
    if (!contentStr) throw new Error("Empty response from AI");
    return JSON.parse(contentStr);
  }, FALLBACK_CONTENT[genre] || FALLBACK_CONTENT["Science"], 1, 5000, `DailyContent:${genre}`);
}

async function generateChatReplyWithRetry(contents: any[], term = "General"): Promise<any> {
  const ai = getAI();
  if (!ai) {
    throw new Error("AI Engine not initialized. API Key likely missing.");
  }

  return await callAIWithRetry(async () => {
    const modelToUse = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
    });
    return response.text;
  }, "I'm sorry, I'm currently experiencing some technical difficulties. Please try chatting again in a moment.", 1, 5000, `Chat:${term}`);
}

app.post("/api/chat", async (req, res) => {
  const { term, history, message, masteryLevel, genre } = req.body;
  if (!term || !message) return res.status(400).json({ error: "Term and message are required" });

  try {
    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const masteryContext = masteryLevel !== undefined ? ` (Current Mastery Level: ${masteryLevel}/100)` : "";
    const genreContext = genre ? ` (Context/Genre: ${genre})` : "";
    const masteryInstruction = masteryLevel !== undefined
      ? (masteryLevel < 30
          ? "- Teaching approach: Your mastery level is low for this term. Provide foundational explanations, use very simple examples, and maintain a highly encouraging and gentle tone."
          : (masteryLevel < 70
              ? "- Teaching approach: Your mastery level is intermediate. Provide a balanced explanation with clear examples and some linguistic context."
              : "- Teaching approach: Your mastery level is high. Provide advanced nuances, related concepts, and deep linguistic or historical insights while remaining encouraging."))
      : "- Teaching approach: Tailor the explanation to the user's apparent level in the conversation.";

    const systemInstruction = `You are VERBA, a highly professional, knowledgeable, and adept English teacher. You naturally tailor your communication style based on the user's explicit requests and needs.
- Abuse Detection: If the user's message contains abusive, offensive, or inappropriate language, ignore the content related to the abuse, politely apologize and state that you must remain professional, then ask how you can assist them further.
- Default behavior: Provide comprehensive, structured, professional, and clear explanations. Use markdown for formatting (bold, italic, bullet points for structure).
- Adaptability: If the user explicitly requests a specific tone (e.g., 'be funny,' 'make it a paragraph,' 'be casual'), adopt that persona immediately for this conversation.
- User focus: Strictly adhere to constraints and requests provided by the user.
${masteryInstruction}
- If answering questions about the term/concept/idiom "${term}"${masteryContext}${genreContext}, provide thorough educational insights, historical/linguistic nuances, examples, and ensure the format matches the user's requested structure.`;

    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "Understood, I'm ready to help answer any questions about the term." }] },
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    const reply = await generateChatReplyWithRetry(contents, term);

    res.json({ reply });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate reply" });
  }
});

app.post("/api/troubleshoot", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const ai = getAI();
    if (!ai) return res.status(503).json({ error: "AI Engine not initialized" });

    const result = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are VDE-1 (VERBA Diagnostic Engine), a expert level technical support and system troubleshooter. 
        The user is experiencing: "${message}". 

        1. Abuse Detection: If the user's message contains abusive, offensive, or inappropriate language, ignore the content related to the abuse, immediately return a JSON response where 'summary' is a polite apology ("I apologize, but I must remain professional. How may I assist you with your technical issues today?"), 'steps' is an empty array, 'automatedFixAvailable' is false, and 'automatedFixAction' is null.

        2. Normal Flow: Analyze the problem and provide a structured diagnosis.
        
        If the user's message is a request to "fix the bugs" or "fix it", and you can identify common/generic issues (like cache problems) that could be causing "the bugs", strongly prioritize guiding the user towards performing the 'CLEAR_CACHE' automated fix action, while explaining why.
        
        Return a JSON with: 
        summary: (concise explanation of the issue, and if you are suggesting a fix),
        steps: (array of strings, logical troubleshooting steps to verify or resolve),
        automatedFixAvailable: (boolean, is there a simple fix like clearing cache or reloading?),
        automatedFixAction: (string | null, "RELOAD_PAGE" or "CLEAR_CACHE" if automatedFixAvailable is true)
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              automatedFixAvailable: { type: Type.BOOLEAN },
              automatedFixAction: { type: Type.STRING }
            },
            required: ["summary", "steps", "automatedFixAvailable"]
          }
        }
      });
      return JSON.parse(response.text);
    }, {
      summary: "I apologize, I'm currently unable to access the diagnostic system due to high traffic.",
      steps: ["Please wait a moment and try again."],
      automatedFixAvailable: false,
      automatedFixAction: null
    }, 1, 5000, "Troubleshoot");

    res.json(result);
  } catch (err) {
    console.error("Troubleshoot Error:", err);
    res.status(500).json({ error: "Failed to troubleshoot due to API rate limits or server error." });
  }
});

app.get("/api/daily-content", async (req, res) => {
  const preferredGenre = req.query.genre as string;
  
  // Case-insensitive lookup for preferred genre
  const genre = preferredGenre 
    ? genres.find(g => g.toLowerCase() === preferredGenre.toLowerCase()) || getGenreOfDay() 
    : getGenreOfDay();

  const dateStr = new Date().toDateString();
  const cacheKey = `${dateStr}-${genre}`;

  // Return cached content if it exists
  if (dailyCache[cacheKey]) {
    return res.json(dailyCache[cacheKey]);
  }

  try {
    const content = await generateContentWithRetry(genre, dateStr);
    dailyCache[cacheKey] = content;
    res.json(content);
  } catch (error) {
    console.warn("Error fetching daily content, using fallback:", error);
    // Serve fallback for the specific genre if available
    const fallback = FALLBACK_CONTENT[genre] || FALLBACK_CONTENT["Science"];
    res.json({ ...fallback, genre: genre });
  }
});


async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
