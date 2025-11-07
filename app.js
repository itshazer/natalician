document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const resultDiv = document.getElementById("result");
    const sensitiveCheckbox = document.getElementById("sensitive-search");
    const sensitiveInfo = document.getElementById("sensitive-info");

    // --- PAGINATION CONSTANTS & STATE ---
    const WORDS_PER_PAGE = 50; 
    let currentPage = 1; 
    let currentMatches = []; // Store the filtered and sorted list globally for pagination
    // --- END PAGINATION CONSTANTS & STATE ---
    
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

    function generateIPA(wordInput) {
        // [IPA Generation Logic is retained and complete]
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
    
    // --- SORTING LOGIC ---
    const NATALICIAN_ALPHABET = "AÄBCČDĎEFGHIJKLŁMNOÖPRŘSŠTŤUÜVZW";
    const letterPriority = {};
    for (let i = 0; i < NATALICIAN_ALPHABET.length; i++) {
        letterPriority[NATALICIAN_ALPHABET[i].toUpperCase()] = i;
        letterPriority[NATALICIAN_ALPHABET[i].toLowerCase()] = i;
    }

    function natalicianCompare(wordA, wordB) {
        const len = Math.min(wordA.length, wordB.length);
        for (let i = 0; i < len; i++) {
            const charA = wordA[i];
            const charB = wordB[i];

            const priorityA = letterPriority[charA] !== undefined ? letterPriority[charA] : Infinity;
            const priorityB = letterPriority[charB] !== undefined ? letterPriority[charB] : Infinity;

            if (priorityA < priorityB) {
                return -1;
            }
            if (priorityA > priorityB) {
                return 1;
            }
        }
        return wordA.length - wordB.length;
    }
    // --- END SORTING LOGIC ---

    // --- NORMALIZATION LOGIC ---
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
    // --- END NORMALIZATION LOGIC ---

    // --- PAGINATION RENDERING FUNCTION (MODIFIED for NEW HTML structure) ---
    function renderPaginationControls(totalMatches, totalPages) {
        // Find existing controls or create a new div for them *before* #result
        let paginationControlsDiv = document.getElementById("pagination-controls");
        if (!paginationControlsDiv) {
            paginationControlsDiv = document.createElement('div');
            paginationControlsDiv.id = "pagination-controls";
            // Insert controls *before* the result div inside the container
            resultDiv.parentNode.insertBefore(paginationControlsDiv, resultDiv);
            
            // Apply essential styling for the new controls div
            paginationControlsDiv.style.marginTop = '10px';
            paginationControlsDiv.style.marginBottom = '10px';
            paginationControlsDiv.style.textAlign = 'center';
        }

        paginationControlsDiv.innerHTML = ""; // Clear existing controls

        if (totalPages <= 1) {
            // Remove the controls div if not needed
            if (paginationControlsDiv.parentNode) {
                paginationControlsDiv.parentNode.removeChild(paginationControlsDiv);
            }
            return; 
        }

        let controlsHTML = "";
        const isFirst = currentPage === 1;
        const isLast = currentPage === totalPages;

        // "Go to first"
        controlsHTML += `<button class="pagination-btn" onclick="goToPage(1)" ${isFirst ? 'disabled' : ''}>Go to first</button>`;

        // "go to previous"
        controlsHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${isFirst ? 'disabled' : ''}>go to previous</button>`;
        
        // Previous dots/page
        if (currentPage > 3) {
            controlsHTML += `<span class="dots">...</span>`;
        }
        if (currentPage > 1) {
             // "prevous page number"
             controlsHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})">${currentPage - 1}</button>`;
        }
        
        // "current page number" (unclickable)
        controlsHTML += `<span class="pagination-btn current-page">${currentPage}</span>`;

        // Next dots/page
        if (currentPage < totalPages) {
             // "next page"
             controlsHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})">${currentPage + 1}</button>`;
        }
        if (currentPage < totalPages - 2) {
            controlsHTML += `<span class="dots">...</span>`;
        }
        
        // "go to next"
        controlsHTML += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${isLast ? 'disabled' : ''}>go to next</button>`;

        // "go to last"
        controlsHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})" ${isLast ? 'disabled' : ''}>go to last</button>`;

        paginationControlsDiv.innerHTML = controlsHTML;
        
        // Note: The necessary styling for these buttons (like padding, background, etc.) 
        // will need to be added to the style.css file if you want them to look polished, 
        // as they are not currently defined there.
    }

    // --- Global Page Navigation Function ---
    window.goToPage = function(page) {
        const totalPages = Math.ceil(currentMatches.length / WORDS_PER_PAGE);

        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            displayCurrentPage(); // Change to use the subset display function
            
            // Scroll to the top of the results div (since the whole page is fixed)
            resultDiv.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    // --- END PAGINATION FUNCTIONS ---

    // --- NEW: Function to display the words for the current page ---
    function displayCurrentPage() {
        resultDiv.innerHTML = "";
        
        if (currentMatches.length === 0) {
            resultDiv.innerHTML = "<p>No matching words found.</p>";
            renderPaginationControls(0, 0);
            return;
        }

        const totalMatches = currentMatches.length;
        const totalPages = Math.ceil(totalMatches / WORDS_PER_PAGE);
        
        // Reset to page 1 if current page is now out of bounds
        if (currentPage > totalPages) {
            currentPage = 1;
        }

        const startIndex = (currentPage - 1) * WORDS_PER_PAGE;
        const endIndex = startIndex + WORDS_PER_PAGE;
        const wordsToDisplay = currentMatches.slice(startIndex, endIndex);
        
        let htmlContent = ""; 
        
        wordsToDisplay.forEach(match => {
            const wordData = words[match][0];
            const generatedIPA = generateIPA(match);
            
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
        });
        
        resultDiv.innerHTML = htmlContent;
        renderPaginationControls(totalMatches, totalPages);
    }
    // --- END displayCurrentPage ---

    // --- MODIFIED: Main filtering/sorting function ---
    function filterAndSortWords(words) {
        const query = searchInput.value.trim();
        const isSensitive = sensitiveCheckbox.checked; 
        const searchableQuery = getSearchableValue(query, isSensitive); 

        let matches = [];

        // 1. Filtering Logic
        for (const word in words) {
            const wordData = words[word][0]; 

            const searchableWord = getSearchableValue(word, isSensitive);
            const searchableAlt1 = wordData.alt1 ? getSearchableValue(wordData.alt1, isSensitive) : "";
            const searchableAlt2 = wordData.alt2 ? getSearchableValue(wordData.alt2, isSensitive) : "";
            const searchableDefinition = getSearchableValue(wordData.definition, isSensitive); 

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
        
        // 2. Sorting Logic (Using Natalician Compare)
        matches.sort(natalicianCompare);
        
        currentMatches = matches; // Update the global matches list
        
        // Always reset to page 1 after filtering/sorting
        currentPage = 1;
        
        displayCurrentPage();
    }
    // --- END filterAndSortWords ---


    fetch("words.json")
        .then(response => response.json())
        .then(words => {
            // --- EVENT LISTENERS ---
            filterAndSortWords(words); // Initial load

            searchInput.addEventListener("input", () => filterAndSortWords(words));
            
            sensitiveCheckbox.addEventListener("change", () => {
                // The toggle of sensitiveInfo display is handled by the browser based on the `style` attribute in index.html
                // We just need to trigger the search.
                filterAndSortWords(words);
            });
        })
        .catch(error => console.error("Error loading words:", error));
    
    function normalizeAll(str) {
        return fullNormalize(str);
    }
});
