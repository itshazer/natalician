document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const resultDiv = document.getElementById("result");
    
    // NEW ELEMENTS
    const sensitiveCheckbox = document.getElementById("sensitive-search");
    const sensitiveInfo = document.getElementById("sensitive-info");
    
    const DISPLAY_LIMIT = 300; 

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
        // [Function body for generateIPA remains the same as the last version you approved]
        let word = wordInput.replace(/[^A-ZÄÖÜČĎŁŘŠŤ]/gi, '').toUpperCase();
        if (!word) return "/--/";
        
        let chars = Array.from(word);

        // 1. Rule 4: Voiceless Assimilation
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

        // 2. Final IPA Generation applying Rules 1, 2, 3
        let finalIpaList = [];
        let i = 0;
        
        while (i < word.length) {
            const char = word[i];
            const isWordInitial = i === 0;
            const prevChar = i > 0 ? word[i-1] : '';
            const nextChar = i < word.length - 1 ? word[i+1] : '';

            // Rule 3: IU / UI Precedence
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
            
            // Rule 2: I / U Approximants next to any other vowel
            if (char === 'I' || char === 'U') {
                const isNextToVowel = VOWELS.includes(prevChar) || VOWELS.includes(nextChar);
                    
                if (isNextToVowel) {
                    finalIpaList.push(char === 'I' ? 'j' : 'w');
                    i++;
                    continue;
                }
            }
            
            // Rule 1: H-Rule
            if (char === 'H') {
                finalIpaList.push(isWordInitial ? 'h' : 'j');
                i++;
                continue;
            }
            
            // Base mapping and Ł
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

    
    // --- CORRECTED NORMALIZATION FUNCTION ---
    function fullNormalize(str) {
        // Always start by lowercasing the whole string
        str = str.toLowerCase(); 

        // 1. Explicitly replace the 9 language-specific special characters with their base variants (INSENSITIVE SEARCH)
        str = str.replace(/[ä]/g, "a");
        str = str.replace(/[č]/g, "c");
        str = str.replace(/[ď]/g, "d");
        str = str.replace(/[ł]/g, "l");
        str = str.replace(/[ö]/g, "o");
        str = str.replace(/[ř]/g, "r");
        str = str.replace(/[š]/g, "s");
        str = str.replace(/[ť]/g, "t");
        str = str.replace(/[ü]/g, "u");

        // 2. Handle generic normalization and remaining specific diacritic characters (from previous steps)
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
    
    // Helper function used by the main logic to decide whether to normalize or not
    function getSearchableValue(text, isSensitive) {
        // If sensitive, just lowercase and use the text as is.
        // If insensitive, run the full normalization.
        return isSensitive ? text.toLowerCase() : fullNormalize(text);
    }
    // --- END NORMALIZATION FUNCTIONS ---


    fetch("words.json")
        .then(response => response.json())
        .then(words => {
            function displayWords() {
                const query = searchInput.value.trim();
                const isSensitive = sensitiveCheckbox.checked; 
                
                // CRUCIAL: Normalize the query based on the checkbox state
                const searchableQuery = getSearchableValue(query, isSensitive); 

                resultDiv.innerHTML = "";
                let matches = [];

                // 1. Filtering Logic
                for (const word in words) {
                    const wordData = words[word][0]; 

                    // CRUCIAL: Normalize the dictionary fields based on the checkbox state
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

                if (matches.length > 0) {
                    // 2. Sorting Logic
                    matches.sort((a, b) => a.localeCompare(b));
                    
                    // --- Apply Display Limit ---
                    const wordsToDisplay = Math.min(matches.length, DISPLAY_LIMIT);
                    let htmlContent = ""; 
                    
                    for (let i = 0; i < wordsToDisplay; i++) {
                        const match = matches[i];
                        const wordData = words[match][0];
                        
                        // Generate IPA live
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
                    
                    // Truncation message
                    if (matches.length > DISPLAY_LIMIT) {
                        resultDiv.innerHTML += `
                            <p style="text-align:center; padding: 20px 0; color: #777;">
                                Displaying the first ${DISPLAY_LIMIT} words. Please refine your search. 
                                (${matches.length - DISPLAY_LIMIT} more matching words hidden)
                            </p>
                        `;
                    }
                } else {
                    resultDiv.innerHTML = "<p>No matching words found.</p>";
                }
            }
            
            // --- EVENT LISTENERS ---
            
            displayWords(); 

            searchInput.addEventListener("input", displayWords);
            
            sensitiveCheckbox.addEventListener("change", function() {
                displayWords();
                // Toggle visibility of the info text
                sensitiveInfo.style.display = this.checked ? 'block' : 'none';
            });
        })
        .catch(error => console.error("Error loading words:", error));
    
    // Keep this for backwards compatibility with old code if it exists, though not strictly necessary now.
    function normalizeAll(str) {
        return fullNormalize(str);
    }
});