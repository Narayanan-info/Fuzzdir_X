const axios = require("axios");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const options = {
  wordlist: null,
  url: null,
};

function showBanner() {
  console.log("                                                                               ");
  console.log("  ███████╗██╗   ██╗███████╗███████╗██████╗ ██╗██████╗         ██╗  ██╗         ");
  console.log("  ██╔════╝██║   ██║╚══███╔╝╚══███╔╝██╔══██╗██║██╔══██╗        ╚██╗██╔╝         ");
  console.log("  █████╗  ██║   ██║  ███╔╝   ███╔╝ ██║  ██║██║██████╔╝         ╚███╔╝          ");
  console.log("  ██╔══╝  ██║   ██║ ███╔╝   ███╔╝  ██║  ██║██║██╔══██╗         ██╔██╗          ");
  console.log("  ██║     ╚██████╔╝███████╗███████╗██████╔╝██║██║  ██║███████╗██╔╝ ██╗         ");
  console.log("  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝         ");
  console.log("	           Advance & Powerful Directory Fuzzer                          ");
  console.log("		        By: Narayanan | @infops                           ");
  console.log("	            Hackerone & Bugcroud | @infops                            ");
  console.log("Usage: node fuzzdir.js -u <URL> -w <Wordlist>");
  console.log("  -u: Enter the URL");
  console.log("  -w: Enter the Wordlist");
  console.log("  -h: Help");
  process.exit(1);
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "-w" || arg === "--wordlist") {
    options.wordlist = args[i + 1];
  } else if (arg === "-u" || arg === "--url") {
    options.url = args[i + 1];
  } else if (arg === "-h" || arg === "--help") {
    showBanner();
  }
}

if (!options.wordlist || !options.url) {
  console.error("Please provide both the wordlist (-w) and target URL (-u).");
  process.exit(1);
}

const base_url = options.url;
const wordlist_path = options.wordlist;

async function fuzzDirectories() {
  try {
    const wordlist = fs.readFileSync(wordlist_path, "utf-8").split("\n");
    const valid200 = [];
    const forbidden403 = [];
    const notFound404 = [];

    console.log("Starting directory fuzzing...");

    // Define the maximum number of concurrent requests
    const concurrency = 5; // Adjust the concurrency level as needed

    // Split the wordlist into smaller chunks to process concurrently
    const chunkedWordlist = chunkArray(wordlist, concurrency);

    // Process each chunk of URLs concurrently using Promise.all
    const requests = chunkedWordlist.map(async (chunk) => {
      return await Promise.all(
        chunk.map(async (dir) => {
          const url = `${base_url}/${dir}`;
          try {
            const response = await axios.get(url);

            if (response.status === 200) {
              console.log(`${url} - 200 OK`);
              valid200.push(response.status + " " + url);
            } else if (response.status === 403) {
              console.log(`${url} - 403 Forbidden`);
              forbidden403.push(response.status + " " + url);
            }
          } catch (error) {
            if (error.response && error.response.status === 403) {
              console.log(`${url} - 403 Forbidden`);
              forbidden403.push(error.response.status + " " + url);
            } else if (error.response && error.response.status === 404) {
              console.log(`${url} - 404 Not Found`);
              notFound404.push(error.response.status + " " + url);
            } else {
              console.log(`${url} - Error: ${error.message}`);
            }
          }
        })
      );
    });

    await Promise.all(requests);

    console.log("Fuzzing completed.");

    // Create the "output" folder if it doesn't exist
    const outputFolderPath = path.join(__dirname, "output");
    if (!fs.existsSync(outputFolderPath)) {
      fs.mkdirSync(outputFolderPath);
    }

    // Save the valid URLs with status 200 to "Fuzzed200.txt"
    const valid200Urls = valid200.join("\n");
    fs.writeFileSync(
      path.join(outputFolderPath, "Fuzzed200.txt"),
      valid200Urls,
      "utf-8"
    );

    // Save the URLs with status 403 to "Fuzzed403.txt"
    const forbidden403Urls = forbidden403.join("\n");
    fs.writeFileSync(
      path.join(outputFolderPath, "Fuzzed403.txt"),
      forbidden403Urls,
      "utf-8"
    );

    // Save the URLs with status 404 to "Fuzzed404.txt"
    const notFound404Urls = notFound404.join("\n");
    fs.writeFileSync(
      path.join(outputFolderPath, "Fuzzed404.txt"),
      notFound404Urls,
      "utf-8"
    );

    console.log(
      'Fuzzed 200 URLs have been saved to the "output/Fuzzed200.txt" file.'
    );
    console.log(
      'Fuzzed 403 URLs have been saved to the "output/Fuzzed403.txt" file.'
    );
    console.log(
      'Fuzzed 404 URLs have been saved to the "output/Fuzzed404.txt" file.'
    );
  } catch (err) {
    console.error("Error reading the wordlist file:", err.message);
  }
}

// Function to chunk the array into smaller chunks
function chunkArray(array, size) {
  const chunkedArr = [];
  let index = 0;
  while (index < array.length) {
    chunkedArr.push(array.slice(index, size + index));
    index += size;
  }
  return chunkedArr;
}

// Run the directory fuzzing function
fuzzDirectories();
