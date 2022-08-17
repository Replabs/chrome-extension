/**
 * The onboarding flow, shown as a popup that is injected on https://twitter.com.
 */

const id = (str: string) => "twitrep-onboarding-" + str;

function hideOnboarding(e?: Event) {
  e?.stopPropagation();

  const popup = document.getElementById(id("container"));

  popup?.style.setProperty("opacity", "0");
  popup?.style.setProperty("visibility", "hidden");
}

function onInput(e: Event) {
  const next = document.getElementById(id("next"));

  console.log((e.target as HTMLTextAreaElement).value);

  if ((e.target as HTMLTextAreaElement).value) {
    next.classList.remove("disabled");
  } else {
    next.classList.add("disabled");
  }
}

/**
 * Get the template HTML for the current step.
 */
function getOnboardingHtml(step: number, lists = []) {
  if (step == 0) {
    // The HTML for the modal.
    return `
    <div id="${id("container")}">
      <div id="twitrep-onboarding">
        <h2>Welcome!</h2>
        <button id="${id("close")}">&times;</button>
        <div id="${id("content")}">
          <p>TwitRep is an experimental multi-dimensional reputation system built for Twitter. It uses conversations between people in lists to determine who seem trustworthy. This is done using the PageRank algorithm and natural language processing.</p>
          <p>You will be asked to select which lists and areas you want to use TwitRep for.</p>
        </div>
        <div id="${id("next-row")}">
          <button id="${id("next")}">Next</button>
        </div>
      </div>
    </div>`;
  } else if (step == 1) {
    let labels = "";

    for (const list of lists) {
      labels += `
          <label class="${id("checkbox-container")}">${list.name}
            <input class="${id("checkbox")}" type="checkbox" value="${list.id}">
            <span class="${id("checkmark")}"></span>
          </label>
        `;
    }

    return `
      <div id="${id("container")}">
       <div id="twitrep-onboarding">
          <h2>Which lists would you like to analyze?</h2>
          <button id="${id("close")}">&times;</button>
          <div id="${id("content")}">
            ${labels}
          </div>
          <div id="${id("next-row")}">
            <button id="${id("back")}">Back</button>
            <button id="${id("next")}">Next</button>
          </div>
        </div>
      </div>`;
  } else if (step == 2) {
    return `
      <div id="${id("container")}">
        <div id="twitrep-onboarding">
          <h2>What type of reputation are you interested in?</h2>
          <button id="${id("close")}">&times;</button>
          <div id="${id("content")}">
            <p>Add an area where you struggle to know who you can trust on Twitter.</p>
            <div>
              <input id="${id("type")}" type="text" autocapitalize="word" />
            </div>
          </div>
          <div id="${id("next-row")}">
            <button id="${id("back")}">Back</button>
            <button id="${id("next")}" class="disabled">Next</button>
          </div>
        </div>
      </div>`;
  } else {
    return `
      <div id="${id("container")}">
        <div id="twitrep-onboarding" class="final">
          <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M106.236 0.511132C104.861 0.759632 102.274 1.19013 100.486 1.46813C88.405 3.34613 77.1715 7.04763 65.7365 12.9181C53.937 18.9761 44.6345 25.7596 35.2295 35.1651C18.3915 52.0026 7.63 71.7196 2.477 95.1721C2.2355 96.2721 1.7915 98.7471 1.4905 100.672C1.19 102.597 0.7285 105.423 0.465 106.952C-0.155 110.555 -0.155 129.289 0.465 132.892C0.7285 134.421 1.19 137.247 1.4905 139.172C2.419 145.112 3.7585 150.782 5.686 156.927C7.9385 164.11 13.3765 175.732 17.965 183.172C26.9285 197.705 42.2035 212.98 56.7365 221.944C67.135 228.357 80.21 233.923 90.6115 236.365C95.5635 237.527 97.3385 237.887 100.736 238.418C102.661 238.719 105.487 239.18 107.016 239.444C110.619 240.064 129.353 240.064 132.956 239.444C134.485 239.18 137.311 238.719 139.236 238.418C145.176 237.49 150.846 236.15 156.991 234.223C164.174 231.97 175.796 226.532 183.236 221.944C197.769 212.98 213.045 197.705 222.008 183.172C228.392 172.821 234.034 159.585 236.394 149.422C237.669 143.931 237.967 142.466 238.482 139.172C238.783 137.247 239.245 134.421 239.508 132.892C240.128 129.289 240.128 110.555 239.508 106.952C239.245 105.423 238.783 102.597 238.482 100.672C237.109 91.8851 235.045 84.3551 231.697 75.9176C225.707 60.8211 216.539 46.9601 204.743 35.1651C198.319 28.7401 190.053 22.1051 183.236 17.9006C172.885 11.5166 159.649 5.87413 149.486 3.51463C143.995 2.23963 142.53 1.94113 139.236 1.42613C137.311 1.12563 134.485 0.664132 132.956 0.400632C129.53 -0.189368 109.66 -0.106868 106.236 0.511132ZM173.219 87.4051L182.192 96.3886L178.218 100.53C174.853 104.038 160.191 119.005 115.016 165.047C111.036 169.103 107.657 172.419 107.508 172.415C107.247 172.409 103.612 168.947 89.9865 155.729C71.7765 138.065 62.9865 129.371 62.9865 129.023C62.9865 128.81 67.039 124.606 71.992 119.68L80.998 110.725L83.117 112.736C84.283 113.843 87.4835 116.868 90.2295 119.46C92.9755 122.052 97.348 126.197 99.9455 128.672C102.543 131.147 105.2 133.678 105.85 134.297C106.5 134.916 107.199 135.422 107.404 135.422C107.803 135.422 112.128 131.059 143.003 99.5026C153.856 88.4091 162.811 79.1281 162.903 78.8776C163.316 77.7491 164.799 78.9751 173.219 87.4051Z" fill="#479BE9"/>
          </svg>
          <h2>All Good!</h2>
          <div id="${id("content")}">
            <p>Reputation is being calculated in the background.</p>
          </div>
          <button id="${id("next")}">Done</button>
        </div>
      </div>`;
  }
}

async function showOnboarding() {
  const data = await chrome.storage.local.get("onboarding");
  const onboarding = data.onboarding;

  const modal = document.getElementById(id("container"));

  // Create the HTML template.
  const template = document.createElement("template");
  template.innerHTML = getOnboardingHtml(
    onboarding.step,
    onboarding.lists
  ).trim();

  if (modal) {
    // Replace the modal content.
    modal.replaceWith(template.content.firstChild);
  } else {
    // Attach the template to the body.
    const body = [...document.getElementsByTagName("body")][0];
    body.appendChild(template.content.firstChild);
  }

  // Make the modal visible, if it isn't already.
  const node = document.getElementById(id("container"));
  node?.style.setProperty("opacity", "1");
  node?.style.setProperty("visibility", "visible");

  // Add the option to close the modal.
  const close = document.getElementById(id("close"));
  const done = document.getElementById(id("done"));
  close?.addEventListener("click", hideOnboarding, false);
  done?.addEventListener("click", hideOnboarding, false);

  // Update the state of the next button on the input step.
  const input = document.getElementById(id("type"));
  input?.addEventListener("input", onInput, false);

  const onNext = async () => {
    const next = document.getElementById(id("next"));

    if (next.classList.contains("disabled")) {
      return;
    }

    if (onboarding.step == 1) {
      // Get the list IDs from the checked checkbox values.
      const ids = Array.from(
        document.querySelectorAll(`input[class='${id("checkbox")}']:checked`),
        (e: HTMLInputElement) => e.value
      );

      // Update the onboarding info.
      onboarding.selectedLists = ids;
    } else if (onboarding.step == 2) {
      // Set the reputation type to the input field's value.
      const input = document.getElementById(id("type"));
      onboarding.type = (input as HTMLInputElement)?.value;
      onboarding.done = true;

      // Send a message to the background script to start crawling tweets for the user's lists.
      chrome.runtime.sendMessage({
        type: "ONBOARDING_FINISHED",
        onboarding: onboarding,
      });
    } else if (onboarding.step == 3) {
      hideOnboarding();
      return;
    }

    // Go to the next onboarding step.
    onboarding.step++;

    // Update the onboarding info.
    await chrome.storage.local.set({ onboarding: onboarding });

    console.log("aljnwdiauwd");
    showOnboarding();
  };

  const onBack = () => {
    onboarding.step--;
    chrome.storage.local.set({ onboarding: onboarding });
    console.log("<wdlknaw");
    showOnboarding();
  };

  // Navigate to the next step when clicking the next button.
  const next = document.getElementById(id("next"));
  next?.addEventListener("click", onNext, false);

  // Navigate back a step when clicking the back button.
  const back = document.getElementById(id("back"));
  back?.addEventListener("click", onBack, false);
}

// Register the event listener.
chrome.runtime.onMessage.addListener((message, _, __) => {
  console.log("RECEIVED MESSAGE", message);
  if (message.type == "SHOW_ONBOARDING") {
    console.log("Show onboarding function called!");
    showOnboarding();
  }
});

console.log("RUNNING ONBOARDING");
