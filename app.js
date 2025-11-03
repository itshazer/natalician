document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const resultDiv = document.getElementById("result");

    // --- NEW: Custom Natalician Alphabet Order and Priority Map ---
    const NATALICIAN_ALPHABET = "AÄBCČDĎEFGHIJKLŁMNOÖPRŘSŠTŤUÜVZW";
    const letterPriority = {};
    for (let i = 0; i < NATALICIAN_ALPHABET.length; i++) {
        letterPriority[NATALICIAN_ALPHABET[i].toUpperCase()] = i;
        letterPriority[NATALICIAN_ALPHABET[i].toLowerCase()] = i;
    }

    // --- NEW: Custom Comparison Function ---
    function natalicianCompare(wordA, wordB) {
        const len = Math.min(wordA.length, wordB.length);
        for (let i = 0; i < len; i++) {
            const charA = wordA[i];
            const charB = wordB[i];

            const priorityA = letterPriority[charA] !== undefined ? letterPriority[charA] : Infinity;
            const priorityB = letterPriority[charB] !== undefined ? letterPriority[charB] : Infinity;

            if (priorityA < priorityB) {
                return -1; // wordA comes first
            }
            if (priorityA > priorityB) {
                return 1; // wordB comes first
            }
            // If priorities are equal, continue to the next letter
        }

        // If one word is a prefix of the other, the shorter one comes first
        return wordA.length - wordB.length;
    }

    fetch("words.json")
        .then(response => response.json())
        .then(words => {
            function displayWords(query = "") {
                resultDiv.innerHTML = "";
                // Note: Normalizing the query before searching is still fine.
                query = normalizeAll(query.toLowerCase().trim()); 

                let matches = [];

                for (const word in words) {
                    const wordData = words[word][0]; 

                    // Get normalized versions of searchable fields
                    const normalizedWord = normalizeAll(word.toLowerCase());
                    const normalizedAlt1 = wordData.alt1 ? normalizeAll(wordData.alt1.toLowerCase()) : "";
                    const normalizedAlt2 = wordData.alt2 ? normalizeAll(wordData.alt2.toLowerCase()) : "";
                    const normalizedDefinition = normalizeAll(wordData.definition.toLowerCase()); 

                    if (
                        query === "" ||
                        normalizedWord.includes(query) ||
                        normalizedAlt1.includes(query) ||
                        normalizedAlt2.includes(query) ||
                        normalizedDefinition.includes(query)
                    ) {
                        matches.push(word);
                    }
                }

                // --- MODIFIED CODE: Custom Alphabetical Sorting ---
                if (matches.length > 0) {
                    // Sort the matches array using the custom comparison function
                    matches.sort(natalicianCompare); // CHANGED LINE
                    
                    matches.forEach(match => {
                        const wordData = words[match][0];
                        
                        // Display logic (remains the same)
                        resultDiv.innerHTML += `
                            <div class="word-box">
                                <div class="word-header">
                                    <h2 class="transliteration">${match}</h2>
                                </div>
                                <p class="ipa">${wordData.ipa}</p>
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
                } else {
                    resultDiv.innerHTML = "<p>No matching words found.</p>";
                }
            }

            displayWords();

            searchInput.addEventListener("input", function () {
                displayWords(this.value);
            });
        })
        .catch(error => console.error("Error loading words:", error));

    function normalizeAll(str) {
        // Normalization remains the same
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") 
            .replace(/[Āā]/g, "a")
            .replace(/[Īī]/g, "i")
            .replace(/[Ūū]/g, "u")
            .replace(/[Ħħ]/g, "h")
            .replace(/[D̯d̯]/g, "d")
            .replace(/[S̯s̯]/g, "s")
            .replace(/[T̯t̯]/g, "t")
            .replace(/[Z̯z̯]/g, "z");
    }

});
