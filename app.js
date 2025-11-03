document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search");
    const resultDiv = document.getElementById("result");

    fetch("words.json")
        .then(response => response.json())
        .then(words => {
            function displayWords(query = "") {
                resultDiv.innerHTML = "";
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

                // --- NEW CODE: Alphabetical Sorting ---
                if (matches.length > 0) {
                    // Sort the matches array alphabetically based on the word key
                    matches.sort((a, b) => a.localeCompare(b));
                    
                    matches.forEach(match => {
                        const wordData = words[match][0];
                        
                        // Display logic
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