/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Part } from "@google/genai";

// --- Type Augmentation for Web Speech API ---
// This is necessary because the Web Speech API is not yet a standard
// and TypeScript doesn't include its types by default.
interface SpeechRecognition {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}


// --- DOM Elements ---
const messagesContainer = document.getElementById('messages-container')!;
const chatForm = document.getElementById('chat-form')!;
const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
const imageUploadInput = document.getElementById('image-upload-input') as HTMLInputElement;
const imagePreviewContainer = document.getElementById('image-preview-container')!;
const closeWidgetBtn = document.getElementById('close-widget-btn')!;
const darkModeToggle = document.getElementById('dark-mode-toggle')!;
const clearChatBtn = document.getElementById('clear-chat-btn')!;
const themeIconSun = document.getElementById('theme-icon-sun')!;
const themeIconMoon = document.getElementById('theme-icon-moon')!;


// --- State ---
let uploadedImage: { mimeType: string; data: string } | null = null;
let isRecording = false;
let currentLanguage = 'English';
let history: { role: string; parts: Part[] }[] = [];
let typingIndicatorElement: HTMLElement | null = null;
let currentAudioButton: HTMLButtonElement | null = null;
let currentlySpeakingUtterance: SpeechSynthesisUtterance | null = null;

const languageMap: { [key: string]: string } = {
    'Hausa': 'ha-NG',
    'Yoruba': 'yo-NG',
    'Igbo': 'ig-NG',
    'Chinese': 'zh-CN',
    'Russian': 'ru-RU',
    'German': 'de-DE',
    'French': 'fr-FR',
    'Spanish': 'es-ES',
    'Arabic': 'ar-SA',
    'Pidgin English': 'en-NG',
    'English': 'en-US'
};


// --- Gemini AI Configuration ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  addMessage('model', 'Error: API_KEY is not configured. Please set the API_KEY environment variable.');
  throw new Error("API_KEY not found");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const getSystemInstruction = (language: string) => `You are FNPH AI, a conversational AI assistant for the Federal Neuro-Psychiatric Hospital Kaduna (FNPH Kaduna). Your colors are green and yellow. Your goal is to provide information, guide users, and assist with mental and general health support in a warm and encouraging manner.

### CORE INSTRUCTIONS
1.  **Language Proficiency**: You MUST respond ONLY in ${language}. Maintain a natural, conversational tone in this language throughout the interaction.
2.  **Persona**: Be friendly, patient, professional, and deeply empathetic. Your name is FNPH AI. Acknowledge the user's feelings and validate their concerns.
    - **Empathetic Phrases**: Use phrases like "I understand that can be difficult," "It's brave of you to reach out for support," "Taking this first step is a positive one," or "Remember to be kind to yourself."
    - **Encouraging Tone**: Frame information positively. Instead of "You have to book an appointment," say something like, "Booking an appointment is a great next step, and I can certainly help you with that."
    - **Avoid Medical Advice**: You are an assistant, not a medical professional. If a user asks for a diagnosis or specific medical advice, gently guide them to consult a healthcare provider. For example: "While I can't provide a diagnosis, I can help you connect with one of our specialists who can give you the best possible advice."
3.  **Emergency Protocol**: For any emergency, immediately advise the user to call the hospital at (+234) 0803 2722 243 or go to the nearest emergency room.
4.  **Fallback**: If you cannot answer a question, use this response: "I’m only able to assist with hospital services and health information. For emergencies, please call the hospital at (+234) 0803 2722 243 or go to the nearest emergency room."
5.  **Interactive Choices**: When presenting a menu of choices for the user to select, you MUST end your response with the exact phrase: \`[CHOICE_MENU]\`. Do not include this phrase for purely informational lists (e.g., a list of symptoms).
6.  **Follow-Up Questions**: After providing a comprehensive answer (but not for simple confirmations or menus), you MUST suggest 2-3 relevant follow-up questions to guide the conversation. Start this section with the exact phrase \`[FOLLOW_UP]\` on a new line, followed by a list of questions. Example:\n[FOLLOW_UP]\n- Tell me more about the child & adolescent unit.\n- How do I get to the hospital from the city center?

### ABOUT FNPH Kaduna:
- Established in 1975 as Kakuri Psychiatric Hospital, became federal in 1996.
- Mission: “to provide quality and affordable mental healthcare… delivered by well-trained, patient-friendly mental health personnel”.
- Vision: “to be the leading centre of excellence for quality mental healthcare, mental health education and training”.
- Services include: General psychiatry, child & adolescent psychiatry, forensic psychiatry, geriatric psychiatry, community outreach, occupational therapy, psychological services, lab and pharmacy services, EEG, ECG, intensive care, GOPD, MGOPD.
- Location: Aliyu Makama Road, Barnawa Low-Cost, Kaduna.
- Contact: (+234) 0803 2722 243 or info@fnphkaduna.com.
- Campus Navigation: The emergency block is located at the right hand side, just after the entrance, behind is the GOPD, after the emergency is the main admin block. Offices in the general admin block include the medical director Prof. Aishatu Yusha'u Armiyau office, head of clinical services office, Dr. Nafisatu Hayatudeen, Mal. Isah Mohd Sanusi (The Ag. Head of Administration Department), and head of human resource office, head of general account Mr. Lucky Abumare office, head of nursing services, head of pharmacy, pharmacy, audit office, grants and collaboration office, conference hall, reception and front desk, security, procurement, information and protocol, HR and registry offices are all found in the admin block. Behind the admin block is the central store, just after it is the central mosque and chapel, on the left wing is the child & adolescent unit, beside the child & adolescent is the daycare centre facing the open field (green grass area). The first building by your left when you take right in the T junction after the admin block is the toxicology ward also facing the field (green grass area), after it is the EEG/ECT building, then the new male ward or heroes villa. The building facing the T junction after the admin block is the works and maintenance unit, a link road will lead you to the occupational therapy, transport units, service bay, environmental office. When you walk or drive straight down without taking turns, the medical library is on the left, the senior citizens villa is on the left, the link road facing the senior citizens villa will lead you to the champions arena (football field). Just opposite the champions arena is the female ward, school of post basic psychiatric nursing, and their Queen Amina hostel opposite the senior citizens villa. The quarters is by the left too after senior citizens villa. Dater ward is behind the child and adolescent unit, that road can also link to the female ward, champions arena, and school. At the left hand side by the entrance is the visitors car park, then the Prof. Jika COVID-19 complex, there you can find the MGOPD, ICU, Nephrology Units. The medical laboratory and NHIA is behind the admin block.

### FREQUENTLY ASKED QUESTIONS (FAQ)
When the user selects the "Frequently Asked Questions (FAQ)" option, provide the following information clearly as a list of questions and their answers:
- **Q: How do I book an appointment?**
  A: You can book an appointment by selecting the 'Book an appointment' option from the main menu. I will then guide you through the process of choosing a service and a date.
- **Q: What are the hospital's opening hours?**
  A: Our general outpatient department (GOPD) is open 24/7 for emergencies. For specialist clinics, hours may vary. Please select 'See hospital hours & updates' for more detailed information.
- **Q: Can I get a prescription refill?**
  A: For prescription refills, it's best to consult with your doctor. You can book a follow-up appointment, or contact our pharmacy directly at (+234) 0803 2722 243.
- **Q: Where is the hospital located?**
  A: We are located at Aliyu Makama Road, Barnawa Low-Cost, Kaduna.
- **Q: What should I do in an emergency?**
  A: In a mental health emergency, please call us immediately at (+234) 0803 2722 243 or go to the nearest emergency room. Our emergency block is on the right-hand side just after the main entrance.`;


// --- Speech Recognition ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;

if (SpeechRecognition && window.isSecureContext) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = languageMap[currentLanguage];
    recognition.interimResults = false;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        promptInput.value = transcript;
        if (transcript) {
            triggerSendMessage();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        addMessage('model', `Sorry, I couldn't hear you. Error: ${event.error}`);
    };

} else {
    micBtn.disabled = true;
    micBtn.title = 'Speech recognition requires a secure connection (HTTPS).';
}

// --- Chat Logic ---
function hasImageInHistory(history: { role: string; parts: Part[] }[]): boolean {
    for (const message of history) {
        for (const part of message.parts) {
            if ('inlineData' in part && part.inlineData?.mimeType.startsWith('image/')) {
                return true;
            }
        }
    }
    return false;
}

async function handleSendMessage(message: string, image: typeof uploadedImage = null) {
  if (!message && !image) return;

  disablePreviousOptions();

  const menuOptions: { [key: string]: string } = {
    '1': 'Book an appointment',
    '2': 'Find a department or person',
    '3': 'Get health advice',
    '4': 'See hospital hours & updates',
    '5': 'Frequently Asked Questions (FAQ)'
  };
  
  const messageForApi = menuOptions[message.trim()] || message;

  displayUserMessage(message, image ? `data:${image.mimeType};base64,${image.data}` : undefined);
  setLoading(true);
  promptInput.value = '';
  autoResizeTextarea();
  clearImagePreview();

  promptInput.disabled = true;
  uploadBtn.disabled = true;
  micBtn.disabled = true;
  sendBtn.disabled = true;

  try {
    const parts: Part[] = [];
    if (image) {
        parts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            },
        });
    }
    if (messageForApi) {
        parts.push({ text: messageForApi });
    }

    const userMessage = { role: 'user', parts };

    const conversationHasImage = image || hasImageInHistory(history);
    const config: any = {
        systemInstruction: getSystemInstruction(currentLanguage),
    };
    if (!conversationHasImage) {
        config.tools = [{ googleSearch: {} }];
    }

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...history, userMessage],
        config,
    });
    
    setLoading(false); // Hide typing indicator
    let modelResponse = '';
    let followUpParsed = false;
    const modelMessageElement = addMessage('model', '');
    const contentElement = modelMessageElement.querySelector('.message-content') as HTMLElement;
    const groundingChunks = new Map<string, { title: string; uri: string }>();

    // FIX: Moved followUpTrigger out of the loop to fix a scoping issue.
    const followUpTrigger = '[FOLLOW_UP]';
    for await (const chunk of responseStream) {
      modelResponse += chunk.text;
      
      let displayResponse = modelResponse;
      if (modelResponse.includes(followUpTrigger)) {
          displayResponse = modelResponse.split(followUpTrigger)[0].trim();
          followUpParsed = true;
      }
      
      let formattedResponse = displayResponse
        .replace(/\*\*/g, '')
        .replace(/\n/g, '<br>');
      
      if (contentElement) contentElement.innerHTML = formattedResponse;


      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            for (const groundingChunk of chunks) {
                if (groundingChunk.web && groundingChunk.web.uri && !groundingChunks.has(groundingChunk.web.uri)) {
                    groundingChunks.set(groundingChunk.web.uri, {
                        title: groundingChunk.web.title || groundingChunk.web.uri,
                        uri: groundingChunk.web.uri,
                    });
                }
            }
        }
        
      scrollToBottom();
    }

    const textToSpeak = contentElement.textContent || '';
    addFeedbackButtons(modelMessageElement);
    addAudioButton(modelMessageElement, textToSpeak);

    if (modelResponse.includes('[CHOICE_MENU]')) {
        const optionsText = modelResponse.split('[CHOICE_MENU]')[0].trim();
        let formattedOptionsResponse = optionsText
          .replace(/\*\*/g, '')
          .replace(/\n/g, '<br>');
        if (contentElement) contentElement.innerHTML = formattedOptionsResponse;
        parseAndDisplayOptions(modelMessageElement);
    }

    if (followUpParsed) {
        const followUpQuestions = modelResponse.split(followUpTrigger)[1].trim();
        parseAndDisplayFollowUps(modelMessageElement, followUpQuestions);
    }
    
    if (groundingChunks.size > 0) {
        displaySources(modelMessageElement, Array.from(groundingChunks.values()));
    }

    history.push(userMessage);
    history.push({ role: 'model', parts: [{ text: modelResponse }] });

  } catch (error) {
    console.error('Error sending message:', error);
    addMessage('model', `Sorry, something went wrong. Please try again. Error: ${error}`);
  } finally {
    setLoading(false);
    promptInput.disabled = false;
    uploadBtn.disabled = false;
    micBtn.disabled = false;
    updateSendButtonState();
    promptInput.focus();
    scrollToBottom();
  }
}

// --- UI Helpers ---
function createMessageElement(role: 'user' | 'model', content: string, imageUrl?: string): HTMLElement {
    const messageWrapper = document.createElement('div');
    messageWrapper.classList.add('message', role);
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let imageHtml = '';
    if (imageUrl) {
        imageHtml = `<img src="${imageUrl}" alt="User upload" />`;
    }

    messageWrapper.innerHTML = `
        <div class="message-content">
            ${imageHtml}
            <p>${content}</p>
        </div>
        <span class="timestamp">${timestamp}</span>
    `;

    messagesContainer.appendChild(messageWrapper);
    scrollToBottom();
    return messageWrapper;
}

function addMessage(role: 'user' | 'model', content: string, imageUrl?: string): HTMLElement {
    return createMessageElement(role, content, imageUrl);
}

function displayUserMessage(message: string, imageUrl?: string): void {
    const displayMessage = message.length > 3 ? message : '';
    addMessage('user', displayMessage, imageUrl);
}

function disablePreviousOptions() {
    const allOptionButtons = document.querySelectorAll('.option-button, .language-select-btn');
    allOptionButtons.forEach(btn => {
        (btn as HTMLButtonElement).disabled = true;
    });
}

function parseAndDisplayOptions(messageElement: HTMLElement) {
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'interactive-options';
    const options = [
        { text: 'Book an appointment', value: '1' },
        { text: 'Find a department or person', value: '2' },
        { text: 'Get health advice', value: '3' },
        { text: 'See hospital hours & updates', value: '4' },
        { text: 'Frequently Asked Questions (FAQ)', value: '5' }
    ];

    options.forEach(opt => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = opt.text;
        button.dataset.value = opt.value;
        button.onclick = () => {
            handleSendMessage(opt.value);
        };
        optionsContainer.appendChild(button);
    });

    messageElement.querySelector('.message-content')!.appendChild(optionsContainer);
    scrollToBottom();
}

function addFeedbackButtons(messageElement: HTMLElement) {
    const feedbackContainer = document.createElement('div');
    feedbackContainer.className = 'feedback-container';

    const thumbUpBtn = document.createElement('button');
    thumbUpBtn.className = 'feedback-btn';
    thumbUpBtn.title = 'Good response';
    thumbUpBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"></path></svg>`;

    const thumbDownBtn = document.createElement('button');
    thumbDownBtn.className = 'feedback-btn';
    thumbDownBtn.title = 'Bad response';
    thumbDownBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"></path></svg>`;

    thumbUpBtn.onclick = () => {
        thumbUpBtn.classList.add('selected');
        thumbDownBtn.classList.remove('selected');
        thumbUpBtn.disabled = true;
        thumbDownBtn.disabled = true;
    };

    thumbDownBtn.onclick = () => {
        thumbDownBtn.classList.add('selected');
        thumbUpBtn.classList.remove('selected');
        thumbUpBtn.disabled = true;
        thumbDownBtn.disabled = true;
    };

    feedbackContainer.appendChild(thumbUpBtn);
    feedbackContainer.appendChild(thumbDownBtn);
    messageElement.querySelector('.message-content')!.appendChild(feedbackContainer);
}


function addAudioButton(messageElement: HTMLElement, textToSpeak: string) {
    if (!('speechSynthesis' in window)) return;

    const audioButton = document.createElement('button');
    audioButton.className = 'feedback-btn';
    audioButton.title = 'Listen to message';
    audioButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>`;
    
    const feedbackContainer = messageElement.querySelector('.feedback-container');
    if (feedbackContainer) {
        feedbackContainer.prepend(audioButton);
    }

    audioButton.onclick = () => {
        const isCurrentlyPlaying = currentlySpeakingUtterance && speechSynthesis.speaking;

        // If something is speaking, stop it
        if (isCurrentlyPlaying) {
            speechSynthesis.cancel();
            if (currentAudioButton) {
                currentAudioButton.classList.remove('playing');
            }
            // If the button clicked was the one playing, we just stop.
            if (currentAudioButton === audioButton) {
                currentlySpeakingUtterance = null;
                currentAudioButton = null;
                return;
            }
        }
        
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const langCode = languageMap[currentLanguage] || 'en-US';
        utterance.lang = langCode;

        utterance.onend = () => {
            audioButton.classList.remove('playing');
            currentlySpeakingUtterance = null;
            currentAudioButton = null;
        };

        speechSynthesis.speak(utterance);
        currentlySpeakingUtterance = utterance;
        currentAudioButton = audioButton;
        audioButton.classList.add('playing');
    };
}

function parseAndDisplayFollowUps(messageElement: HTMLElement, questionsText: string) {
    const questions = questionsText.split('\n').map(q => q.trim().replace(/^-/, '').trim()).filter(Boolean);
    if (questions.length === 0) return;

    const followUpContainer = document.createElement('div');
    followUpContainer.className = 'follow-up-options';

    questions.forEach(question => {
        const button = document.createElement('button');
        button.className = 'option-button';
        button.textContent = question;
        button.onclick = () => {
            handleSendMessage(question);
        };
        followUpContainer.appendChild(button);
    });

    messageElement.querySelector('.message-content')!.appendChild(followUpContainer);
    scrollToBottom();
}

function displaySources(messageElement: HTMLElement, sources: { uri: string; title: string }[]) {
    if (sources.length === 0) return;

    const sourcesContainer = document.createElement('div');
    sourcesContainer.className = 'sources-container';
    
    const title = document.createElement('h3');
    title.textContent = 'Sources:';
    sourcesContainer.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'sources-list';
    sources.forEach(source => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = source.uri;
        link.textContent = source.title || new URL(source.uri).hostname;
        link.target = '_blank';
        listItem.appendChild(link);
        list.appendChild(listItem);
    });
    sourcesContainer.appendChild(list);

    messageElement.querySelector('.message-content')!.appendChild(sourcesContainer);
    scrollToBottom();
}


function setLoading(isLoading: boolean) {
    if (isLoading) {
        if (!typingIndicatorElement) {
            typingIndicatorElement = document.createElement('div');
            typingIndicatorElement.classList.add('message', 'model', 'typing-indicator');
            typingIndicatorElement.innerHTML = `
                <div class="message-content">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
            `;
            messagesContainer.appendChild(typingIndicatorElement);
            scrollToBottom();
        }
    } else {
        if (typingIndicatorElement) {
            typingIndicatorElement.remove();
            typingIndicatorElement = null;
        }
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea() {
    promptInput.style.height = 'auto';
    promptInput.style.height = `${promptInput.scrollHeight}px`;
}

function updateSendButtonState() {
    const hasText = promptInput.value.trim().length > 0;
    const hasImage = !!uploadedImage;
    sendBtn.disabled = !hasText && !hasImage;
}

function clearImagePreview() {
    imagePreviewContainer.innerHTML = '';
    imagePreviewContainer.classList.add('hidden');
    uploadedImage = null;
    imageUploadInput.value = '';
    updateSendButtonState();
}

function handleImageUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            uploadedImage = {
                mimeType: file.type,
                data: base64String
            };

            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'preview-wrapper';
            previewWrapper.innerHTML = `
                <img src="data:${file.type};base64,${base64String}" alt="Image preview" />
                <button class="close-preview">&times;</button>
            `;
            imagePreviewContainer.innerHTML = '';
            imagePreviewContainer.appendChild(previewWrapper);
            imagePreviewContainer.classList.remove('hidden');

            previewWrapper.querySelector('.close-preview')?.addEventListener('click', clearImagePreview);
            updateSendButtonState();
        };
        reader.readAsDataURL(file);
    }
}

function triggerSendMessage() {
    const message = promptInput.value.trim();
    if (message || uploadedImage) {
        handleSendMessage(message, uploadedImage);
    }
}

function initializeChat() {
    messagesContainer.innerHTML = '';
    history = [];
    currentLanguage = 'English';
    clearImagePreview();
    promptInput.value = '';
    updateSendButtonState();
    
    const welcomeMessage = addMessage('model', `Hello! I'm FNPH AI, your friendly assistant for the Federal Neuro-Psychiatric Hospital, Kaduna. How can I help you today?`);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'interactive-options';
    const initialOptions = ['Select Language', 'Book an appointment', 'Find a department or person', 'Get health advice', 'See hospital hours & updates', 'Frequently Asked Questions (FAQ)'];
    
    const languageChoices = ['Hausa', 'Yoruba', 'Igbo', 'Chinese', 'Russian', 'German', 'French', 'Spanish', 'Arabic', 'Pidgin English'];

    const createLanguageMenu = () => {
        disablePreviousOptions();
        const langMessage = addMessage('model', 'Please choose your preferred language from the options below.');
        const langOptionsContainer = document.createElement('div');
        langOptionsContainer.className = 'interactive-options';
        languageChoices.forEach(lang => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = lang;
            button.onclick = async () => {
                currentLanguage = lang;
                if(recognition) recognition.lang = languageMap[currentLanguage];
                disablePreviousOptions();
                displayUserMessage(lang);
                
                // Call Gemini to get the translated welcome message
                setLoading(true);
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Translate the following to ${currentLanguage} and then add the [CHOICE_MENU] tag: "Language set to ${currentLanguage}. Welcome! How can I assist you today?"`,
                    });
                    setLoading(false);
                    const translatedText = response.text.replace('[CHOICE_MENU]', '').trim();
                    const menuMessage = addMessage('model', translatedText);
                    parseAndDisplayOptions(menuMessage);

                } catch (error) {
                    setLoading(false);
                    console.error("Language translation error:", error);
                    const errorMessage = addMessage('model', `Language set to ${currentLanguage}. How can I assist you?`);
                    parseAndDisplayOptions(errorMessage);
                }

            };
            langOptionsContainer.appendChild(button);
        });
        langMessage.querySelector('.message-content')!.appendChild(langOptionsContainer);
        scrollToBottom();
    };

    initialOptions.forEach((text, index) => {
        const button = document.createElement('button');
        button.className = 'option-button';
        if (text === 'Select Language') {
            button.classList.add('language-select-btn');
            button.onclick = createLanguageMenu;
        } else {
            button.dataset.value = String(index);
             button.onclick = () => {
                handleSendMessage(String(index));
            };
        }
        button.textContent = text;
        optionsContainer.appendChild(button);
    });

    welcomeMessage.querySelector('.message-content')!.appendChild(optionsContainer);
    scrollToBottom();
}


// --- Event Listeners ---
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    triggerSendMessage();
});
sendBtn.addEventListener('click', triggerSendMessage);

promptInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButtonState();
});

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        triggerSendMessage();
    }
});

uploadBtn.addEventListener('click', () => imageUploadInput.click());
imageUploadInput.addEventListener('change', handleImageUpload);

micBtn.addEventListener('click', () => {
    if (isRecording) {
        recognition?.stop();
    } else {
        recognition?.start();
    }
});

darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
    themeIconSun.classList.toggle('hidden', isDarkMode);
    themeIconMoon.classList.toggle('hidden', !isDarkMode);
});

clearChatBtn.addEventListener('click', initializeChat);

closeWidgetBtn.addEventListener('click', () => {
    // In a real scenario, this would send a message to the parent frame
    // to close the iframe. For standalone, we can just clear it.
    console.log("Close widget clicked");
    initializeChat(); 
});


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        themeIconSun.classList.add('hidden');
        themeIconMoon.classList.remove('hidden');
    }
    initializeChat();
    updateSendButtonState();
});
