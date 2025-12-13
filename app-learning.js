document.addEventListener("DOMContentLoaded", function () {
    const lessonContentDiv = document.getElementById("lesson-content");

    // Elements for dynamic content (will be cached after renderQuizStructure runs)
    let questionTextElement;
    let optionsDiv;
    let feedbackElement;
    let nextButton;

    // --- GLOBAL STATE ---
    let wordsData = {}; 
    let currentQuestion = null; 
    let questionsCompleted = 0;
    let score = 0; // <<< NEW: Tracks correct answers
    let incorrectAnswers = []; // <<< NEW: Tracks words the user got wrong
    
    const TOTAL_QUESTIONS = 10;
    const NUM_OPTIONS = 4;

    // --- 1. QUIZ START & DATA FETCH ---

    // Note: Assuming "words.json" is in the same directory as learning.html now.
    fetch("words.json") 
        .then(response => {
            if (!response.ok) {
                // If the fetch path is wrong, try the parent directory as a fallback
                if (response.status === 404) {
                     return fetch("../words.json");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(words => {
            wordsData = words;
            if (Object.keys(wordsData).length === 0) {
                lessonContentDiv.innerHTML = "<h2>Error: Dictionary data is empty.</h2>";
                return;
            }
            renderQuizStructure();
            loadNewQuestion();
        })
        .catch(error => {
            console.error("Error loading dictionary data:", error);
            lessonContentDiv.innerHTML = "<h2>Failed to load practice data. Check the console for errors.</h2>";
        });

    // --- 2. UI SETUP ---

    function renderQuizStructure() {
        lessonContentDiv.innerHTML = `
            <h2>
                Score: <span id="current-score">0</span> / ${TOTAL_QUESTIONS}
            </h2>
            <p class="quiz-question" id="question-text"></p>
            <div id="options"></div>
            <p id="feedback"></p>
            <button id="next-button" class="action-button" style="display: none;">Next Word →</button>
        `;

        // Cache the dynamically created elements
        questionTextElement = document.getElementById("question-text");
        optionsDiv = document.getElementById("options");
        feedbackElement = document.getElementById("feedback");
        nextButton = document.getElementById("next-button");
        // NEW: Cache score display element
        document.getElementById("current-score").textContent = score; 

        nextButton.addEventListener('click', loadNewQuestion);
    }

    // --- 3. CORE QUIZ LOGIC ---

    function loadNewQuestion() {
        // Check if the quiz is finished
        if (questionsCompleted >= TOTAL_QUESTIONS) {
            showFinalScore(); // <<< NEW: Show score summary instead of just "Congratulations"
            return;
        }

        questionsCompleted++;
        // The question number is now implicitly shown by the score
        // document.getElementById("question-number").textContent = questionsCompleted;

        // Reset UI
        optionsDiv.innerHTML = "";
        feedbackElement.textContent = "";
        nextButton.style.display = "none";

        // Generate a new question
        currentQuestion = generateQuestion(wordsData);

        // Display the question
        questionTextElement.textContent = currentQuestion.question;

        // Create and display options
        currentQuestion.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-button';
            button.textContent = option.text;
            button.setAttribute('data-is-correct', option.isCorrect);
            button.addEventListener('click', handleAnswer);
            optionsDiv.appendChild(button);
        });
    }

    function generateQuestion(data) {
        // ... (This function remains unchanged from the previous version) ...
        const allWords = Object.keys(data);

        // 1. Select the correct word randomly
        const correctWordKey = allWords[Math.floor(Math.random() * allWords.length)];
        const correctWordData = data[correctWordKey][0];
        const correctAnswer = correctWordData.definition;
        
        // 2. Decide the quiz type (50/50 chance)
        const isWordToDefinition = Math.random() < 0.5;

        // 3. Set the question text
        const question = isWordToDefinition
            ? `What does "${correctWordKey}" mean?`
            : `Which word means "${correctAnswer}"?`;

        // 4. Gather incorrect answers (distractors)
        let distractors = [];
        let attempts = 0;
        
        while (distractors.length < NUM_OPTIONS - 1 && attempts < allWords.length * 2) {
            attempts++;
            const distractorKey = allWords[Math.floor(Math.random() * allWords.length)];
            const distractorData = data[distractorKey][0];
            
            // Get the distractor text based on the question type
            const distractorText = isWordToDefinition 
                ? distractorData.definition
                : distractorKey;
            
            // Ensure the distractor is unique and not the correct answer
            const isUnique = !distractors.some(d => d.text === distractorText) && 
                             distractorText !== (isWordToDefinition ? correctAnswer : correctWordKey);

            if (isUnique) {
                distractors.push({ text: distractorText, isCorrect: false });
            }
        }

        if (distractors.length < NUM_OPTIONS - 1) {
            console.warn("Could not find enough unique distractors.");
        }
        
        // 5. Create the correct option
        const correctOptionText = isWordToDefinition ? correctAnswer : correctWordKey;
        const correctOption = { text: correctOptionText, isCorrect: true };

        // 6. Combine and shuffle all options
        let options = [...distractors.slice(0, NUM_OPTIONS - 1), correctOption];
        options.sort(() => Math.random() - 0.5);

        return { 
            question, 
            correctWordKey, 
            correctAnswer, 
            options,
            correctOptionText // Store the text of the correct button for feedback
        };
    }


    function handleAnswer(event) {
        const selectedButton = event.target;
        const isCorrect = selectedButton.getAttribute('data-is-correct') === 'true';

        // Disable all options after selection
        optionsDiv.querySelectorAll('.option-button').forEach(button => {
            button.disabled = true;
            // Highlight the correct answer regardless of choice
            if (button.getAttribute('data-is-correct') === 'true') {
                button.style.backgroundColor = '#d4edda'; // Light green for correct
                button.style.borderColor = '#1e7e34';
            }
        });

        // Update score and tracking
        if (isCorrect) {
            score++; // <<< INCREMENT SCORE
            feedbackElement.textContent = "Correct! Well done.";
            feedbackElement.className = 'correct';
            selectedButton.style.backgroundColor = '#28a745'; 
            selectedButton.style.color = 'white';
        } else {
            // <<< TRACK INCORRECT ANSWERS
            incorrectAnswers.push({
                word: currentQuestion.correctWordKey,
                definition: currentQuestion.correctAnswer
            });
            //
            
            feedbackElement.textContent = `Incorrect. The correct answer was: "${currentQuestion.correctOptionText}".`;
            feedbackElement.className = 'incorrect';
            selectedButton.style.backgroundColor = '#f8d7da'; 
            selectedButton.style.borderColor = '#dc3545';
        }
        
        // Update the score display
        document.getElementById("current-score").textContent = score;

        // Show the next button
        nextButton.style.display = 'block';
    }

    // --- 4. FINAL SCORE DISPLAY (NEW FUNCTION) ---

    function showFinalScore() {
        let summaryHtml = `
            <h2>✅ Lesson Complete!</h2>
            <p style="font-size: 2em; margin: 10px 0;">Your final score is: 
                <span style="color: ${score >= TOTAL_QUESTIONS * 0.7 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                    ${score} / ${TOTAL_QUESTIONS}
                </span>
            </p>
        `;

        if (incorrectAnswers.length > 0) {
            summaryHtml += `
                <h3 style="color: #dc3545; margin-top: 30px;">Review the following words:</h3>
                <ul style="list-style: none; padding: 0; text-align: left; width: 80%; max-width: 400px;">
            `;
            
            // Display a list of incorrect words with their definitions
            incorrectAnswers.forEach(item => {
                summaryHtml += `
                    <li style="margin: 10px 0; padding: 5px; border-bottom: 1px dotted #ccc;">
                        <strong>${item.word}</strong>: ${item.definition}
                    </li>
                `;
            });
            
            summaryHtml += `</ul>`;
        } else {
            summaryHtml += `
                <p style="font-style: italic; color: #28a745;">
                    Perfect score! You've mastered this vocabulary set.
                </p>
            `;
        }

        summaryHtml += `
            <div style="margin-top: 30px;">
                <button class="action-button" onclick="window.location.reload()">Start New Lesson</button>
            </div>
        `;

        lessonContentDiv.innerHTML = summaryHtml;
    }

    // --- END CORE QUIZ LOGIC ---

});