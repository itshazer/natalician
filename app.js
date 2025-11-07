document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const resultDiv = document.getElementById("result");
    const sensitiveCheckbox = document.getElementById("sensitive-search");
    const sensitiveInfo = document.getElementById("sensitive-info");
    const paginationControls = document.getElementById("pagination-controls");
    
    // --- NEW PAGINATION CONSTANTS ---
    const WORDS_PER_PAGE = 25;
    
    // --- GLOBAL STATE ---
    let state = {
        matches: [],        // Stores all filtered and sorted words
        currentPage: 1,
        currentQuery: "",
        isSensitive: false
    };

    // --- IPA Mapping and Constants (Unchanged) ---
    const IPA_MAP = {
        'A': 'a', 'Ä': 'æ', 'B': 'b', 'C': 'd͡ʒ', 'Č': 't͡ʃ', 
        'D': 'd', 'Ď': 'ð', 'E': 'e', 'F': 'f', 'G': 'g', 
        'I': 'i', 'J': 'ʒ', 'K': 'k', 'L': 'l', 'Ł': 'ː',
        'M': 'm', 'N': 'n', 'O': 'o', 'Ö': 'œ', 'P': 'p', 
        'R': 'ɾ', 'Ř': 'ʁ', 'S': 's', 'Š': 'ʃ', 'T': 't', 
        'Ť': 'θ', 'U': 'u', 'Ü': 'y', 'V': 'v', 'Z': 'z', 'W': 'w'
    };
    
    const VOWELS = "AÄEIOÖUÜ";
    const VOICED_CONSONANTS = ["B", "C", "D", "Ď", "G", "J", "L", "M", "N", "R", "Ř", "V", "Z", "W"]; 
    const VOICELESS_CONSONANTS = ["P", "Č", "F", "K", "S", "Š", "T", "Ť"];

    const ASSIMILATION_PAIRS = {
        'P': 'B', 'T': 'D', 'K': 'G', 
        'S': 'Z', 'Š': 'J', 
        'Č': 'C', 'Ť': 'Ď',
        'F': 'V' 
    };

    // --- IPA Generation Logic (Unchanged) ---
    function generateIPA(wordInput) {
        let word = wordInput.replace(/[^A-ZÄÖÜČĎŁŘŠŤ]/gi, '').toUpperCase();
        if (!word) return "/--/";
        
        let chars = Array.from(word);

        for (let i = 0; i < chars.length - 1; i++) {
            const char1 = chars[i];
            const char2 = chars[i+1];
            
            if (VOICELESS_CONSONANTS.includes(char1) && VOICED_CONSONANTS.includes(char2)) {
                if (ASSIMILATION_PAIRS[char1]) {
                     chars[i] = ASSIMILATION_PAIRS[char1];
                }
            }
        }
        word = chars.join('');

        let finalIpaList = [];
        let i = 0;
        
        while (i < word.length) {
            const char = word[i];
            const isWordInitial = i === 0;
            const prevChar = i > 0 ? word[i-1] : '';
            const nextChar = i < word.length - 1 ? word[i+1] : '';

            if (char === 'I' && nextChar === 'U') { 
                finalIpaList.push('j', 'u');
                i += 2;
                continue;
            }
            if (char === 'U' && nextChar === 'I') { 
                finalIpaList.push('u', 'j');
                i += 2;
                continue;
            }
            
            if (char === 'I' || char === 'U') {
                const isNextToVowel = VOWELS.includes(prevChar) || VOWELS.includes(nextChar);
                    
                if (isNextToVowel) {
                    finalIpaList.push(char === 'I' ? 'j' : 'w');
                    i++;
                    continue;
                }
            }
            
            if (char === 'H') {
                finalIpaList.push(isWordInitial ? 'h' : 'j');
                i++;
                continue;
            }
            
            if (IPA_MAP[char]) {
                 const ipaVal = IPA_MAP[char];
                 if (char === 'Ł') {
                    if (finalIpaList.length > 0 && VOWELS.includes(prevChar)) {
                        finalIpaList[finalIpaList.length - 1] += ipaVal;
                    }
                 } else {
                    finalIpaList.push(ipaVal);
                 }
                 i++;
            } else {
                i++;
            }
        }

        const ipaStr = finalIpaList.join('');
        return `/${ipaStr.toLowerCase()}/`;
    }
    // --- END IPA Generation Logic ---

    
    // --- NORMALIZATION FUNCTIONS (Unchanged) ---
    function fullNormalize(str) {
        str = str.toLowerCase(); 
        str = str.replace(/[ä]/g, "a");
        str = str.replace(/[č]/g, "c");
        str = str.replace(/[ď]/g, "d");
        str = str.replace(/[ł]/g, "l");
        str = str.replace(/[ö]/g, "o");
        str = str.replace(/[ř]/g, "r");
        str = str.replace(/[š]/g, "s");
        str = str.replace(/[ť]/g, "t");
        str = str.replace(/[ü]/g, "u");

        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[ā]/g, "a")
            .replace(/[ī]/g, "i")
            .replace(/[ū]/g, "u")
            .replace(/[ħ]/g, "h")
            .replace(/[d̯]/g, "d")
            .replace(/[s̯]/g, "s")
            .replace(/[t̯]/g, "t")
            .replace(/[z̯]/g, "z");
    }
    
    function getSearchableValue(text, isSensitive) {
        return isSensitive ? text.toLowerCase() : fullNormalize(text);
    }
    // --- END NORMALIZATION FUNCTIONS ---

    
    // --- CORE LOGIC FUNCTIONS ---
    
    // 1. Filters and sorts the entire word list based on search state
    function filterAndSortWords(query, isSensitive, allWords) {
        let matches = [];
        const searchableQuery = getSearchableValue(query, isSensitive); 

        for (const word in allWords) {
            const wordData = allWords[word][0]; 

            const searchableWord = getSearchableValue(word, isSensitive);
            const searchableAlt1 = wordData.alt1 ? getSearchableValue(wordData.alt1, isSensitive) : "";
            const searchableAlt2 = wordData.alt2 ? getSearchableValue(wordData.alt2, isSensitive) : "";
            const searchableDefinition = wordData.definition ? getSearchableValue(wordData.definition, isSensitive) : "";

            if (
                searchableQuery === "" ||
                searchableWord.includes(searchableQuery) ||
                searchableAlt1.includes(searchableQuery) ||
                searchableAlt2.includes(searchableQuery) ||
                searchableDefinition.includes(searchableQuery)
            ) {
                matches.push(word);
            }
        }

        matches.sort((a, b) => a.localeCompare(b));
        return matches;
    }

    // 2. Renders the words for the current page
    function displayWords(allWords) {
        const totalMatches = state.matches.length;
        
        const startIndex = (state.currentPage - 1) * WORDS_PER_PAGE;
        const endIndex = startIndex + WORDS_PER_PAGE;
        
        const wordsToDisplay = state.matches.slice(startIndex, endIndex);

        resultDiv.innerHTML = "";
        
        if (wordsToDisplay.length > 0) {
            let htmlContent = "";
            for (let i = 0; i < wordsToDisplay.length; i++) {
                const match = wordsToDisplay[i];
                const wordData = allWords[match][0];
                
                const generatedIPA = generateIPA(match);
                
                // Display logic
                htmlContent += `
                    <div class="word-box">
                        <div class="word-header">
                            <h2 class="transliteration">${match}</h2>
                        </div>
                        <p class="ipa">${generatedIPA}</p> 
                        <p class="definition">${wordData.definition}</p>
                        ${wordData.description ? `<p class="description">${wordData.description}</p>` : ""}

                        ${wordData.examples ? `
                            <p class="examples-header">Examples:</p>
                            <p class="examples">${wordData.examples}</p>
                        ` : ""}

                        ${wordData.note ? `
                            <div class="note-box important-note">
                                <p class="note-header">Note:</p>
                                <p class="note-text">${wordData.note}</p>
                            </div>
                        ` : ""}
                    </div>
                `;
            }
            
            resultDiv.innerHTML = htmlContent;
        } else {
            // Show "No matching words" only when a query is actually entered
            if (state.currentQuery !== "") {
                resultDiv.innerHTML = "<p>No matching words found for your current search.</p>";
            } else {
                // Should only happen if the dictionary file is actually empty/corrupt
                resultDiv.innerHTML = "<p>The dictionary is empty or failed to load data.</p>";
            }
        }
        
        // Scroll results to the top on page change/search
        resultDiv.scrollTop = 0;

        // 3. Render pagination controls
        renderPagination(totalMatches, allWords);
    }

    // 4. Renders the pagination controls (Improved for Last Page access)
    function renderPagination(totalMatches, allWords) {
        const totalPages = Math.ceil(totalMatches / WORDS_PER_PAGE);
        paginationControls.innerHTML = ''; 

        if (totalPages <= 1) {
            return;
        }
        
        let paginationHtml = '';
        const currentPage = state.currentPage;

        // Previous button
        paginationHtml += `<button class="pagination-button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;
        
        // --- Page Buttons Logic ---
        const maxButtons = 5; // Max page numbers to show in the window
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // Adjust start if we're near the end
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // Always show page 1 and ellipsis if not in the window
        if (startPage > 1) {
            paginationHtml += `<button class="pagination-button" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHtml += `<span>...</span>`;
            }
        }

        // Render the main window buttons
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `<button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        // Always show last page and ellipsis if not in the window
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<span>...</span>`;
            }
            paginationHtml += `<button class="pagination-button" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        paginationHtml += `<button class="pagination-button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;
        
        paginationControls.innerHTML = paginationHtml;

        // Attach event listeners
        paginationControls.querySelectorAll('.pagination-button').forEach(button => {
            if (!button.disabled && button.tagName === 'BUTTON') { // Ensure we only add listeners to buttons
                button.addEventListener('click', function() {
                    const newPage = parseInt(this.getAttribute('data-page'));
                    state.currentPage = newPage;
                    // Re-display results without re-filtering
                    displayWords(allWords); 
                });
            }
        });
    }

    // 5. Handles input/checkbox changes
    function setupApp(allWords) {
        // --- FIX: Initial population is run here to ensure state.matches is never empty on load ---
        state.matches = filterAndSortWords("", false, allWords);
        state.currentQuery = "";
        state.isSensitive = false;
        state.currentPage = 1;
        displayWords(allWords); // Initial display of words

        function handleSearchChange() {
            const query = searchInput.value.trim();
            const isSensitive = sensitiveCheckbox.checked;

            // Check if filtering/sorting is actually needed
            if (query !== state.currentQuery || isSensitive !== state.isSensitive) {
                
                // 1. Update state variables
                state.currentQuery = query;
                state.isSensitive = isSensitive;
                
                // 2. Perform filtering/sorting and update state.matches
                state.matches = filterAndSortWords(query, isSensitive, allWords);
                
                // 3. Display results starting from page 1
                state.currentPage = 1;
            } 
            
            // Always display words after a change
            displayWords(allWords);
        }

        // --- EVENT LISTENERS ---
        searchInput.addEventListener("input", handleSearchChange);
        
        sensitiveCheckbox.addEventListener("change", function() {
            sensitiveInfo.style.display = this.checked ? 'block' : 'none';
            handleSearchChange();
        });
    }

    // --- INITIAL FETCH ---
    fetch("words.json")
        .then(response => response.json())
        .then(words => {
            setupApp(words);
        })
        .catch(error => console.error("Error loading words:", error));
});
